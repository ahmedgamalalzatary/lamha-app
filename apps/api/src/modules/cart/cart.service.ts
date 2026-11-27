import { createHash } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AddCartLine,
  CART_QUANTITY_LIMIT,
  type CartResponse,
  type CartsResponse,
  cartSummary,
  type CustomerCart,
  lineKey,
  minimumOrderLeft,
  type Product,
  unitPrice,
} from '@tawsela/shared';
import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { CatalogRepository, type Tx } from '../catalog/catalog.repository.js';
import { products, stores } from '../catalog/catalog.schema.js';
import { storeIsOpen, toProduct } from '../catalog/store-view.js';
import { users } from '../users/users.schema.js';
import type { EditCartDto } from './dto/cart.dto.js';
import { cartLines, carts } from './cart.schema.js';

type CartRow = typeof carts.$inferSelect;
type LineRow = typeof cartLines.$inferSelect;

const missing = () => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cart or item not found');
const unavailable = () => new ApiException(HttpStatus.CONFLICT, 'CART_ITEM_UNAVAILABLE', 'An item or its choices are unavailable');
const closed = () => new ApiException(HttpStatus.CONFLICT, 'CART_STORE_CLOSED', 'The store is closed');

function validSelection(product: Product, optionIds: number[], removedIds: number[]): boolean {
  const chosen = new Set(optionIds);
  let matched = 0;
  for (const group of product.optionGroups) {
    const count = group.options.filter((option) => chosen.has(option.id)).length;
    if (count > group.maxChoices || (group.required && count === 0)) return false;
    matched += count;
  }
  return matched === optionIds.length && removedIds.every((id) => product.ingredients.some((ingredient) => ingredient.id === id));
}

/**
 * The customer's carts (contract §8.6): one per store, several at once. A closed store's items still
 * go in; "تابع للدفع" (ready) is where a closed store stops the order.
 */
@Injectable()
export class CartService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalog: CatalogRepository,
  ) {}

  /** "سلاتي": a card per cart, newest first [Derived]. */
  async list(userId: number): Promise<CartsResponse> {
    const rows = await this.db
      .select({ id: carts.id, storeId: stores.id, name: stores.name, logo: stores.logo, items: count(cartLines.id) })
      .from(carts)
      .innerJoin(stores, eq(stores.id, carts.storeId))
      .innerJoin(cartLines, eq(cartLines.cartId, carts.id))
      .where(eq(carts.userId, userId))
      .groupBy(carts.id, stores.id)
      .orderBy(desc(carts.id));
    return { carts: rows.map(({ id, storeId, name, logo, items }) => ({ id, store: { id: storeId, name, logo }, items })) };
  }

  /** "حذف كل السلات؟". */
  async clearAll(userId: number): Promise<CartsResponse> {
    await this.db.delete(carts).where(eq(carts.userId, userId));
    return { carts: [] };
  }

  /** One store's cart (سلاتي's delete on its row); the others stay. */
  async removeStore(userId: number, storeId: number): Promise<CartsResponse> {
    await this.db.delete(carts).where(and(eq(carts.userId, userId), eq(carts.storeId, storeId)));
    return this.list(userId);
  }

  get(userId: number, storeId: number): Promise<CartResponse> {
    return this.db.transaction(async (tx) => ({ cart: await this.snapshot(tx, await this.find(tx, userId, storeId)) }));
  }

  /** Adds to the cart of the product's store, starting that cart when there is none yet. */
  add(userId: number, input: AddCartLine): Promise<CartResponse> {
    return this.write(userId, async (tx) => {
      const [row] = await tx.select().from(products).where(eq(products.id, input.productId));
      if (!row?.active) throw unavailable();
      const [store] = await tx.select({ active: stores.active }).from(stores).where(eq(stores.id, row.storeId));
      if (!store?.active) throw unavailable();
      const choices = await this.catalog.choicesOf([row.id], tx);
      const product = toProduct(row, choices.get(row.id));
      if (!validSelection(product, input.optionIds, input.removedIngredientIds)) {
        throw new BadRequestException('Invalid options or ingredients');
      }
      const cartId = await this.cartOf(tx, userId, row.storeId);
      const selectionKey = createHash('sha256').update(lineKey(row.id, input.optionIds, input.removedIngredientIds)).digest('hex');
      const [line] = await tx.select().from(cartLines).where(and(eq(cartLines.cartId, cartId), eq(cartLines.selectionKey, selectionKey)));
      if (line) {
        await this.quantity(tx, line, line.quantity + input.quantity);
      } else {
        await tx.insert(cartLines).values({
          cartId, selectionKey, productId: row.id, quantity: input.quantity,
          optionIds: input.optionIds, removedIngredientIds: input.removedIngredientIds,
        });
      }
      return row.storeId;
    });
  }

  /**
   * "اطلب تاني" (§8.8): puts an order's lines back in that store's cart, as adding them one by one
   * would, and leaves out the ones gone from the menu or whose choices no longer fit. Quantities stop
   * at the limit.
   */
  async reorder(userId: number, storeId: number, items: AddCartLine[]): Promise<{ cart: CustomerCart; skipped: number }> {
    let skipped = 0;
    const { cart } = await this.write(userId, async (tx) => {
      const [store] = await tx.select({ active: stores.active }).from(stores).where(eq(stores.id, storeId));
      if (!store?.active) throw unavailable();
      const ids = [...new Set(items.map((i) => i.productId))];
      const rows = ids.length ? await tx.select().from(products).where(and(inArray(products.id, ids), eq(products.storeId, storeId))) : [];
      const choices = await this.catalog.choicesOf(rows.map((r) => r.id), tx);
      const valid = items.filter((item) => {
        const row = rows.find((r) => r.id === item.productId);
        return row?.active && validSelection(toProduct(row, choices.get(row.id)), item.optionIds, item.removedIngredientIds);
      });
      skipped = items.length - valid.length;
      if (!valid.length) throw unavailable();
      const cartId = await this.cartOf(tx, userId, storeId);
      for (const item of valid) {
        const selectionKey = createHash('sha256').update(lineKey(item.productId, item.optionIds, item.removedIngredientIds)).digest('hex');
        const [line] = await tx.select().from(cartLines).where(and(eq(cartLines.cartId, cartId), eq(cartLines.selectionKey, selectionKey)));
        const quantity = Math.min(CART_QUANTITY_LIMIT, (line?.quantity ?? 0) + item.quantity);
        if (line) await tx.update(cartLines).set({ quantity }).where(eq(cartLines.id, line.id));
        else {
          await tx.insert(cartLines).values({
            cartId, selectionKey, productId: item.productId, quantity,
            optionIds: item.optionIds, removedIngredientIds: item.removedIngredientIds,
          });
        }
      }
      return storeId;
    });
    return { cart: cart!, skipped };
  }

  adjust(userId: number, lineId: number, delta: -1 | 1): Promise<CartResponse> {
    return this.write(userId, async (tx) => {
      const { line, cart } = await this.ownedLine(tx, userId, lineId);
      if (delta > 0) {
        const current = await this.snapshot(tx, cart);
        if (!current?.lines.find((item) => item.id === line.id)?.available) throw unavailable();
      }
      if (line.quantity + delta < 1) {
        throw new BadRequestException('Use DELETE to remove the item');
      }
      await this.quantity(tx, line, line.quantity + delta);
      return cart.storeId;
    });
  }

  remove(userId: number, lineId: number): Promise<CartResponse> {
    return this.write(userId, async (tx) => {
      const { line, cart } = await this.ownedLine(tx, userId, lineId);
      await tx.delete(cartLines).where(eq(cartLines.id, line.id));
      const [remaining] = await tx.select({ id: cartLines.id }).from(cartLines).where(eq(cartLines.cartId, cart.id)).limit(1);
      if (!remaining) await tx.delete(carts).where(eq(carts.id, cart.id));
      return cart.storeId;
    });
  }

  edit(userId: number, { cartId, note, mode }: EditCartDto): Promise<CartResponse> {
    return this.write(userId, async (tx) => {
      const [row] = await tx.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.userId, userId)));
      if (!row || !(await this.snapshot(tx, row))) throw missing();
      if (mode === 'pickup') {
        // Serialize this choice with the store's admin update, which clears existing pickup choices.
        const [store] = await tx.select({ pickupAllowed: stores.pickupAllowed }).from(stores).where(eq(stores.id, row.storeId)).for('share');
        if (!store?.pickupAllowed) {
          throw new ApiException(HttpStatus.CONFLICT, 'CART_PICKUP_UNAVAILABLE', 'This store does not offer pickup');
        }
      }
      if (note !== undefined || mode !== undefined) await tx.update(carts).set({ note, mode }).where(eq(carts.id, cartId));
      return row.storeId;
    });
  }

  /** "تابع للدفع" on one store's cart. */
  validate(userId: number, storeId: number): Promise<CartResponse> {
    return this.db.transaction(async (tx) => {
      const row = await this.find(tx, userId, storeId);
      if (!row) throw missing();
      return { cart: await this.ready(tx, userId, row.id) };
    });
  }

  /**
   * The cart, ready to order: the store is open, every item can be ordered and the minimum is reached.
   * Checkout calls it inside its own transaction, after locking the customer's row.
   */
  async ready(tx: Tx, userId: number, cartId: number): Promise<CustomerCart> {
    const [row] = await tx.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.userId, userId)));
    const cart = await this.snapshot(tx, row);
    if (!cart) throw missing();
    if (!cart.store.isOpen) throw closed();
    if (cart.lines.some((line) => !line.available)) throw unavailable();
    if (minimumOrderLeft(cart.total, cart.store.minimumOrder) > 0) {
      throw new ApiException(HttpStatus.CONFLICT, 'CART_MINIMUM_ORDER', 'The minimum order has not been reached');
    }
    return cart;
  }

  /** Empties the store's cart once its order is placed. */
  async clear(tx: Tx, cartId: number): Promise<void> {
    await tx.delete(carts).where(eq(carts.id, cartId));
  }

  /** Runs a change and answers with the cart of the store it touched (null once emptied). */
  private async write(userId: number, change: (tx: Tx) => Promise<number>): Promise<CartResponse> {
    return this.db.transaction(async (tx) => {
      // The customer row exists before their first cart. Lock it so edits serialize.
      const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).for('update');
      if (!user) throw missing();
      const storeId = await change(tx);
      return { cart: await this.snapshot(tx, await this.find(tx, userId, storeId)) };
    });
  }

  private async find(tx: Tx, userId: number, storeId: number): Promise<CartRow | undefined> {
    const [cart] = await tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.storeId, storeId)));
    return cart;
  }

  /** The store's cart, started when the customer has none there yet. */
  private async cartOf(tx: Tx, userId: number, storeId: number): Promise<number> {
    const existing = await this.find(tx, userId, storeId);
    if (existing) return existing.id;
    const [created] = await tx.insert(carts).values({ userId, storeId }).$returningId();
    return created!.id;
  }

  private async ownedLine(tx: Tx, userId: number, lineId: number): Promise<{ line: LineRow; cart: CartRow }> {
    const [row] = await tx.select({ line: cartLines, cart: carts }).from(cartLines)
      .innerJoin(carts, eq(carts.id, cartLines.cartId))
      .where(and(eq(cartLines.id, lineId), eq(carts.userId, userId)));
    if (!row) throw missing();
    return row;
  }

  private async quantity(tx: Tx, line: LineRow, quantity: number): Promise<void> {
    if (quantity > CART_QUANTITY_LIMIT) {
      throw new ApiException(HttpStatus.CONFLICT, 'CART_QUANTITY_LIMIT', 'The item quantity limit has been reached');
    }
    await tx.update(cartLines).set({ quantity }).where(eq(cartLines.id, line.id));
  }

  private async snapshot(tx: Tx, cart: CartRow | undefined): Promise<CustomerCart | null> {
    if (!cart) return null;
    const [store] = await tx.select().from(stores).where(eq(stores.id, cart.storeId));
    if (!store) return null;
    const rows = await tx.select({ line: cartLines, product: products }).from(cartLines)
      .innerJoin(products, eq(products.id, cartLines.productId)).where(eq(cartLines.cartId, cart.id)).orderBy(asc(cartLines.id));
    if (!rows.length) return null;
    const choices = await this.catalog.choicesOf([...new Set(rows.map(({ product }) => product.id))], tx);
    const lines = rows.map(({ line, product: row }) => {
      const product = toProduct(row, choices.get(row.id));
      return {
        id: line.id,
        key: lineKey(product.id, line.optionIds, line.removedIngredientIds),
        product,
        optionIds: line.optionIds,
        removedIngredientIds: line.removedIngredientIds,
        quantity: line.quantity,
        unitPrice: unitPrice(product, line.optionIds),
        available: product.active && validSelection(product, line.optionIds, line.removedIngredientIds),
      };
    });
    return {
      id: cart.id,
      store: {
        id: store.id,
        name: store.name,
        minimumOrder: store.minimumOrder,
        pickupAllowed: store.pickupAllowed,
        isOpen: store.active && storeIsOpen(store, new Date()),
      },
      note: cart.note,
      mode: store.pickupAllowed ? cart.mode : 'delivery',
      lines,
      ...cartSummary(lines),
    };
  }
}

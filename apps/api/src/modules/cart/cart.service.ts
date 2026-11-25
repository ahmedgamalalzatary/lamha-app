import { createHash } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AddCartLine,
  CART_QUANTITY_LIMIT,
  type CartResponse,
  cartSummary,
  type CustomerCart,
  lineKey,
  minimumOrderLeft,
  type Product,
  unitPrice,
} from '@tawsela/shared';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { CatalogRepository, type Tx } from '../catalog/catalog.repository.js';
import { products, stores } from '../catalog/catalog.schema.js';
import { storeIsOpen, toProduct } from '../catalog/store-view.js';
import { users } from '../users/users.schema.js';
import type { EditCartDto } from './cart.dto.js';
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

@Injectable()
export class CartService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalog: CatalogRepository,
  ) {}

  get(userId: number): Promise<CartResponse> {
    return this.db.transaction(async (tx) => ({ cart: await this.snapshot(tx, await this.find(tx, userId)) }));
  }

  add(userId: number, input: AddCartLine): Promise<CartResponse> {
    return this.write(userId, async (tx, existing) => {
      const [row] = await tx.select().from(products).where(eq(products.id, input.productId));
      if (!row?.active) throw unavailable();
      const [store] = await tx.select().from(stores).where(eq(stores.id, row.storeId));
      if (!store?.active || !storeIsOpen(store, new Date())) throw closed();
      const choices = await this.catalog.choicesOf([row.id], tx);
      const product = toProduct(row, choices.get(row.id));
      if (!validSelection(product, input.optionIds, input.removedIngredientIds)) {
        throw new BadRequestException('Invalid options or ingredients');
      }

      let cartId = existing?.id;
      if (existing) {
        const [firstLine] = await tx.select({ id: cartLines.id }).from(cartLines).where(eq(cartLines.cartId, existing.id)).limit(1);
        if (firstLine && existing.storeId !== row.storeId && existing.id !== input.replaceCartId) {
          throw new ApiException(HttpStatus.CONFLICT, 'CART_STORE_CONFLICT', 'The cart contains items from another store');
        }
        if (!firstLine || existing.storeId !== row.storeId) {
          await tx.delete(carts).where(eq(carts.id, existing.id));
          cartId = undefined;
        }
      }
      if (cartId === undefined) {
        const [created] = await tx.insert(carts).values({ userId, storeId: row.storeId }).$returningId();
        cartId = created!.id;
      }

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
    });
  }

  /**
   * "اطلب تاني" (§8.8): puts an order's lines back in the cart, as adding them one by one would, and
   * leaves out the ones gone from the menu or whose choices no longer fit. Another store's cart is
   * replaced only when the customer agreed (replaceCartId); quantities stop at the limit.
   */
  async reorder(
    userId: number,
    storeId: number,
    items: Omit<AddCartLine, 'replaceCartId'>[],
    replaceCartId?: number,
  ): Promise<{ cart: CustomerCart; skipped: number }> {
    let skipped = 0;
    const { cart } = await this.write(userId, async (tx, existing) => {
      const [store] = await tx.select().from(stores).where(eq(stores.id, storeId));
      if (!store?.active || !storeIsOpen(store, new Date())) throw closed();
      const ids = [...new Set(items.map((i) => i.productId))];
      const rows = ids.length ? await tx.select().from(products).where(and(inArray(products.id, ids), eq(products.storeId, storeId))) : [];
      const choices = await this.catalog.choicesOf(rows.map((r) => r.id), tx);
      const valid = items.filter((item) => {
        const row = rows.find((r) => r.id === item.productId);
        return row?.active && validSelection(toProduct(row, choices.get(row.id)), item.optionIds, item.removedIngredientIds);
      });
      skipped = items.length - valid.length;
      if (!valid.length) throw unavailable();

      let cartId = existing?.id;
      if (existing) {
        const [firstLine] = await tx.select({ id: cartLines.id }).from(cartLines).where(eq(cartLines.cartId, existing.id)).limit(1);
        if (firstLine && existing.storeId !== storeId && existing.id !== replaceCartId) {
          throw new ApiException(HttpStatus.CONFLICT, 'CART_STORE_CONFLICT', 'The cart contains items from another store');
        }
        if (!firstLine || existing.storeId !== storeId) {
          await tx.delete(carts).where(eq(carts.id, existing.id));
          cartId = undefined;
        }
      }
      if (cartId === undefined) {
        const [created] = await tx.insert(carts).values({ userId, storeId }).$returningId();
        cartId = created!.id;
      }
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
    });
    return { cart: cart!, skipped };
  }

  adjust(userId: number, lineId: number, delta: -1 | 1): Promise<CartResponse> {
    return this.write(userId, async (tx, cart) => {
      const line = await this.ownedLine(tx, cart, lineId);
      if (delta > 0) {
        const current = await this.snapshot(tx, cart);
        if (!current?.store.isOpen) throw closed();
        if (!current.lines.find((item) => item.id === line.id)?.available) throw unavailable();
      }
      if (line.quantity + delta < 1) {
        throw new BadRequestException('Use DELETE to remove the item');
      }
      await this.quantity(tx, line, line.quantity + delta);
    });
  }

  remove(userId: number, lineId: number): Promise<CartResponse> {
    return this.write(userId, async (tx, cart) => {
      const line = await this.ownedLine(tx, cart, lineId);
      await tx.delete(cartLines).where(eq(cartLines.id, line.id));
      const [remaining] = await tx.select({ id: cartLines.id }).from(cartLines).where(eq(cartLines.cartId, line.cartId)).limit(1);
      if (!remaining) await tx.delete(carts).where(eq(carts.id, line.cartId));
    });
  }

  edit(userId: number, { cartId, note, mode }: EditCartDto): Promise<CartResponse> {
    return this.write(userId, async (tx, row) => {
      if (row?.id !== cartId) throw missing();
      const cart = await this.snapshot(tx, row);
      if (!cart) throw missing();
      if (mode === 'pickup') {
        // Serialize this choice with the store's admin update, which clears existing pickup choices.
        const [store] = await tx.select({ pickupAllowed: stores.pickupAllowed }).from(stores).where(eq(stores.id, row.storeId)).for('share');
        if (!store?.pickupAllowed) {
          throw new ApiException(HttpStatus.CONFLICT, 'CART_PICKUP_UNAVAILABLE', 'This store does not offer pickup');
        }
      }
      if (note !== undefined || mode !== undefined) await tx.update(carts).set({ note, mode }).where(eq(carts.id, cartId));
    });
  }

  validate(userId: number): Promise<CartResponse> {
    return this.db.transaction(async (tx) => ({ cart: await this.ready(tx, userId) }));
  }

  /**
   * The cart, ready to order: the store is open, every item can be ordered and the minimum is reached.
   * Checkout calls it inside its own transaction, after locking the customer's row.
   */
  async ready(tx: Tx, userId: number): Promise<CustomerCart> {
    const cart = await this.snapshot(tx, await this.find(tx, userId));
    if (!cart) throw missing();
    if (!cart.store.isOpen) throw closed();
    if (cart.lines.some((line) => !line.available)) throw unavailable();
    if (minimumOrderLeft(cart.total, cart.store.minimumOrder) > 0) {
      throw new ApiException(HttpStatus.CONFLICT, 'CART_MINIMUM_ORDER', 'The minimum order has not been reached');
    }
    return cart;
  }

  /** Empties the customer's cart once its order is placed. */
  async clear(tx: Tx, cartId: number): Promise<void> {
    await tx.delete(carts).where(eq(carts.id, cartId));
  }

  private async write(userId: number, change: (tx: Tx, cart: CartRow | undefined) => Promise<void>): Promise<CartResponse> {
    return this.db.transaction(async (tx) => {
      // The customer row exists before their first cart. Lock it so edits and replacements serialize.
      const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).for('update');
      if (!user) throw missing();
      await change(tx, await this.find(tx, userId));
      return { cart: await this.snapshot(tx, await this.find(tx, userId)) };
    });
  }

  private async find(tx: Tx, userId: number): Promise<CartRow | undefined> {
    const [cart] = await tx.select().from(carts).where(eq(carts.userId, userId));
    return cart;
  }

  private async ownedLine(tx: Tx, cart: CartRow | undefined, lineId: number): Promise<LineRow> {
    if (!cart) throw missing();
    const [line] = await tx.select().from(cartLines).where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)));
    if (!line) throw missing();
    return line;
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

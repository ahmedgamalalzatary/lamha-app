import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AdminOrder,
  canReorder,
  type CustomerOrderDetails,
  customerStatusNotice,
  notice,
  type OrderLine,
  type ReorderInput,
  type ReorderResult,
  type CheckoutQuote,
  type CheckoutQuoteInput,
  type CustomerCart,
  type CustomerOrder,
  deliveryFeeFor,
  deliverySlots,
  distanceKm,
  DRIVER_SOCKET_EVENTS,
  type LatLng,
  nextStatus,
  ORDER_SOCKET_EVENTS,
  ORDER_STATUSES,
  type OrderStatus,
  type PartnerAction,
  type PartnerOrder,
  type PartnerOrderCounts,
  type PartnerOrderDetails,
  payout,
  type PlacedOrder,
  type PlaceOrderInput,
} from '@tawsela/shared';
import { and, asc, count as countRows, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { AddressRow } from '../addresses/addresses.schema.js';
import { AddressesService } from '../addresses/addresses.service.js';
import { CartService } from '../cart/cart.service.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { type StoreRow, stores } from '../catalog/catalog.schema.js';
import { cairoMinuteOfDay, locationOf } from '../catalog/store-view.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { ratings } from '../support/support.schema.js';
import { users } from '../users/users.schema.js';
import { nameOf } from '../audit/audit.service.js';
import { OrdersGateway } from './orders.gateway.js';

/** The delivery man, joined beside the customer (both are users). */
const driverUsers = alias(users, 'driver_users');
import { orderEvents, orderLines, type OrderLineRow, type OrderRow, orders } from './orders.schema.js';

const cents = (n: number) => Math.round(n * 100) / 100;
const hhmm = (time: string) => time.slice(0, 5);
const badAddress = () => new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'CHECKOUT_ADDRESS', 'Delivery to this spot is not available from this store');

/** "#506898": six digits, like Tawsilty's order numbers. */
const codeOf = (id: number) => String(100000 + id);

/** Everything the bill depends on, worked out in one place for the quote and the order. */
interface Bill extends CheckoutQuote {
  cart: CustomerCart;
  store: StoreRow;
  address: AddressRow | null;
  spot: LatLng | null;
}

/** Checkout and orders (contract §8.7, §11 الطلبات). Cash on delivery only (§15.1 #2). */
@Injectable()
export class OrdersService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly carts: CartService,
    private readonly addresses: AddressesService,
    private readonly settings: SettingsService,
    private readonly live: OrdersGateway,
    private readonly notices: NotificationsService,
  ) {}

  quote(userId: number, input: CheckoutQuoteInput): Promise<CheckoutQuote> {
    return this.db.transaction(async (tx) => {
      const { cart: _cart, store: _store, address: _address, spot: _spot, ...quote } = await this.bill(tx, userId, input);
      return quote;
    });
  }

  /**
   * Places the order at the bill the customer saw, then empties the cart. The customer's row is
   * locked first, so racing taps and cart edits run one after another; a repeated request id gives
   * back the order it already placed.
   */
  async place(userId: number, input: PlaceOrderInput): Promise<PlacedOrder> {
    let newId: number | undefined;
    const placed = await this.db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).for('update');
      if (!user) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cart or item not found');
      const [placed] = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.customerId, userId), eq(orders.requestId, input.requestId)));
      if (placed) return { order: await this.customerOrder(tx, placed.id) };

      const bill = await this.bill(tx, userId, input);
      if (bill.cartId !== input.cartId) {
        throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_CART_CHANGED', 'The cart changed since the checkout screen loaded');
      }
      if (bill.total !== input.expectedTotal) {
        throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_TOTAL_CHANGED', 'The bill changed; check it again');
      }
      if (input.slot !== null && !bill.slots.includes(input.slot)) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'CHECKOUT_SLOT', 'This delivery time is no longer offered');
      }

      const now = new Date();
      now.setSeconds(0, 0);
      const scheduledFor = input.slot === null ? null : new Date(now.getTime() + (input.slot - cairoMinuteOfDay(now)) * 60_000);
      const rule = await this.settings.delivery(tx);
      const payoutOption = bill.store.payoutOption ?? rule.payoutOption;
      const appPercent = bill.store.appPercent ?? rule.appPercent;
      const { address, spot } = bill;
      const [created] = await tx
        .insert(orders)
        .values({
          customerId: userId,
          storeId: bill.store.id,
          requestId: input.requestId,
          mode: bill.mode,
          addressId: address?.id ?? null,
          addressText: address ? addressText(address) : null,
          phone: address?.phone ?? null,
          lat: spot?.lat ?? null,
          lng: spot?.lng ?? null,
          distanceKm: bill.distanceKm === null ? null : Math.round(bill.distanceKm * 1000) / 1000,
          scheduledFor,
          note: bill.cart.note,
          itemsTotal: bill.itemsTotal,
          deliveryFee: bill.deliveryFee,
          total: bill.total,
          payoutOption,
          appPercent,
          ...payout(bill.itemsTotal, payoutOption, appPercent),
        })
        .$returningId();
      const orderId = created!.id;
      await tx.insert(orderLines).values(
        bill.cart.lines.map((line) => {
          const options = line.product.optionGroups.flatMap((g) => g.options.filter((o) => line.optionIds.includes(o.id)).map((o) => o.name));
          const removed = line.product.ingredients.filter((i) => line.removedIngredientIds.includes(i.id)).map((i) => i.name);
          return {
            orderId,
            productId: line.product.id,
            name: line.product.name,
            options,
            removedIngredients: removed,
            optionIds: line.optionIds,
            removedIngredientIds: line.removedIngredientIds,
            image: line.product.image,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          };
        }),
      );
      await tx.insert(orderEvents).values({ orderId, status: 'pending_review', byUserId: userId });
      await this.carts.clear(tx, bill.cartId);
      newId = orderId;
      return { order: await this.customerOrder(tx, orderId) };
    });
    // Only once it is saved, and only the first time: the store's phones ring for it (§9).
    if (newId !== undefined) {
      const [card] = await this.partnerCards(eq(orders.id, newId));
      this.live.toStore(placed.order.store.id, ORDER_SOCKET_EVENTS.placed, { order: card });
      const code = placed.order.code;
      const id = newId;
      this.notices.tell(await this.notices.storePartners(placed.order.store.id), (locale) => notice('new_order', locale, { code }), {
        path: `/partner-order/${id}`,
        keep: true,
      });
    }
    return placed;
  }

  // The store's side (contract §9, §11.1). Every query is limited to the partner's own store.

  /** الطلبات الجديده and طلباتى: the store's orders, newest first, optionally one status. */
  partnerList(storeId: number, status?: OrderStatus): Promise<PartnerOrder[]> {
    return this.partnerCards(and(eq(orders.storeId, storeId), status ? eq(orders.status, status) : undefined));
  }

  async partnerCounts(storeId: number): Promise<PartnerOrderCounts> {
    const rows = await this.db
      .select({ status: orders.status, n: countRows() })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .groupBy(orders.status);
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as PartnerOrderCounts;
    for (const { status, n } of rows) counts[status] = n;
    return counts;
  }

  async partnerDetails(storeId: number, id: number): Promise<PartnerOrderDetails> {
    const [row] = await this.db
      .select({
        order: orders,
        customer: { firstName: users.firstName, lastName: users.lastName, phone: users.phone },
        driver: { firstName: driverUsers.firstName, lastName: driverUsers.lastName },
        deliveredBy: stores.deliveredBy,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.customerId))
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .leftJoin(driverUsers, eq(driverUsers.id, orders.driverId))
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId)));
    if (!row) throw orderNotFound();
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(asc(orderLines.id));
    const { order, customer, driver } = row;
    return {
      ...toPartnerOrder(order, lines.reduce((n, l) => n + l.quantity, 0)),
      customer: { name: `${customer.firstName} ${customer.lastName}`.trim(), phone: order.phone ?? customer.phone },
      addressText: order.addressText,
      deliveryFee: order.deliveryFee,
      lines: lines.map(toOrderLine),
      payoutOption: order.payoutOption,
      storeFromDriver: order.storeFromDriver,
      driver: driver ? { name: nameOf(driver) } : null,
      deliveredBy: row.deliveredBy,
    };
  }

  /**
   * قبول, رفض, تم التجهيز, تم الاستلام, and خارج للتوصيل and تم التوصيل for a store delivering with its
   * own people. The order row is locked, so two phones tapping at once move it once; the loser gets
   * ORDER_STATUS and sees the order as it is now. Accepting a delivery the app's captains bring
   * offers it to every delivery man (§10); marking it ready tells its delivery man.
   */
  async partnerStep(store: Pick<StoreRow, 'id' | 'deliveredBy'>, userId: number, id: number, action: PartnerAction): Promise<PartnerOrderDetails> {
    const { status, row } = await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.storeId, store.id))).for('update');
      if (!row) throw orderNotFound();
      const next = nextStatus(row.status, action, row.mode, store.deliveredBy);
      if (!next) throw new ApiException(HttpStatus.CONFLICT, 'ORDER_STATUS', `The order is ${row.status}; it cannot be moved by "${action}"`);
      await tx.update(orders).set({ status: next }).where(eq(orders.id, id));
      await tx.insert(orderEvents).values({ orderId: id, status: next, byUserId: userId });
      return { status: next, row };
    });
    this.live.orderChanged(row, { id, status });
    const code = codeOf(id);
    this.notices.tell([row.customerId], (locale) => customerStatusNotice(status, row.mode, code, locale), { path: `/order/${id}`, keep: true });
    if (status === 'preparing' && row.mode === 'delivery' && store.deliveredBy === 'platform') {
      this.live.toDrivers(DRIVER_SOCKET_EVENTS.offer, { id });
      const [named] = await this.db.select({ name: stores.name }).from(stores).where(eq(stores.id, store.id));
      this.notices.tell(await this.notices.workingDrivers(), (locale) => notice('offer', locale, { code, store: named?.name ?? '' }), { path: '/driver', keep: false });
    }
    if (row.driverId !== null) {
      this.live.toDriver(row.driverId, DRIVER_SOCKET_EVENTS.order, { id });
      if (status === 'ready') this.notices.tell([row.driverId], (locale) => notice('order_ready', locale, { code }), { path: `/driver-order/${id}`, keep: true });
    }
    return this.partnerDetails(store.id, id);
  }

  private async partnerCards(where: SQL | undefined): Promise<PartnerOrder[]> {
    const rows = await this.db.select().from(orders).where(where).orderBy(desc(orders.id)).limit(200);
    const counts = await this.counts(this.db, rows.map((r) => r.id));
    return rows.map((row) => toPartnerOrder(row, counts.get(row.id) ?? 0));
  }

  /** طلباتي: the customer's orders, newest first. */
  async mine(userId: number): Promise<CustomerOrder[]> {
    const rows = await this.db
      .select({ order: orders, store: { id: stores.id, name: stores.name, logo: stores.logo } })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.customerId, userId))
      .orderBy(desc(orders.id))
      .limit(100);
    const counts = await this.counts(this.db, rows.map((r) => r.order.id));
    return rows.map(({ order, store }) => toCustomerOrder(order, store, counts.get(order.id) ?? 0));
  }

  /** "تفاصيل الطلب" (§8.8): one of the customer's own orders. */
  async details(userId: number, id: number): Promise<CustomerOrderDetails> {
    const [row] = await this.db
      .select({
        order: orders,
        store: { id: stores.id, name: stores.name, logo: stores.logo },
        driver: { firstName: driverUsers.firstName, lastName: driverUsers.lastName },
        stars: ratings.stars,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .leftJoin(driverUsers, eq(driverUsers.id, orders.driverId))
      .leftJoin(ratings, eq(ratings.orderId, orders.id))
      .where(and(eq(orders.id, id), eq(orders.customerId, userId)));
    if (!row) throw myOrderNotFound();
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(asc(orderLines.id));
    const { order, store, driver } = row;
    return {
      ...toCustomerOrder(order, store, lines.reduce((n, l) => n + l.quantity, 0)),
      addressText: order.addressText,
      driver: order.driverId !== null && driver ? { name: nameOf(driver) } : null,
      lines: lines.map(toOrderLine),
      paymentMethod: 'cash',
      rating: row.stars === null ? null : { stars: row.stars },
    };
  }

  /** "اطلب تاني" (§8.8): a finished order's lines back in the cart, with the same choices. */
  async reorder(userId: number, id: number, input: ReorderInput): Promise<ReorderResult> {
    const [order] = await this.db.select().from(orders).where(and(eq(orders.id, id), eq(orders.customerId, userId)));
    if (!order) throw myOrderNotFound();
    if (!canReorder(order.status)) {
      throw new ApiException(HttpStatus.CONFLICT, 'ORDER_STATUS', `The order is ${order.status}; it can be ordered again once it is over`);
    }
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(asc(orderLines.id));
    const items = lines.flatMap((l) =>
      l.productId === null
        ? []
        : [{ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds ?? [], removedIngredientIds: l.removedIngredientIds ?? [] }],
    );
    const { cart, skipped } = await this.carts.reorder(userId, order.storeId, items, input.replaceCartId);
    return { cart, skipped: skipped + lines.length - items.length };
  }

  /** The dashboard's الطلبات table: newest first, optionally one status tab. */
  async adminList(status?: OrderStatus): Promise<AdminOrder[]> {
    const rows = await this.db
      .select({
        order: orders,
        store: { id: stores.id, name: stores.name, logo: stores.logo },
        deliveredBy: stores.deliveredBy,
        customer: { id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone },
        driver: { firstName: driverUsers.firstName, lastName: driverUsers.lastName },
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .innerJoin(users, eq(users.id, orders.customerId))
      .leftJoin(driverUsers, eq(driverUsers.id, orders.driverId))
      .where(status ? eq(orders.status, status) : undefined)
      .orderBy(desc(orders.id))
      .limit(200);
    const counts = await this.counts(this.db, rows.map((r) => r.order.id));
    return rows.map(({ order, store, deliveredBy, customer, driver }) => ({
      ...toCustomerOrder(order, store, counts.get(order.id) ?? 0),
      customer: { id: customer.id, name: `${customer.firstName} ${customer.lastName}`.trim(), phone: order.phone ?? customer.phone },
      note: order.note,
      hasDriver: order.driverId !== null,
      driver: order.driverId !== null && driver ? { id: order.driverId, name: nameOf(driver) } : null,
      deliveredBy,
      paymentMethod: 'cash',
      payoutOption: order.payoutOption,
      appShare: order.appShare,
      storeFromDriver: order.storeFromDriver,
    }));
  }

  /** The bill for the customer's ready cart: the distance fee for a delivery, none for a pickup. */
  private async bill(tx: Tx, userId: number, input: CheckoutQuoteInput): Promise<Bill> {
    const cart = await this.carts.ready(tx, userId);
    const [store] = await tx.select().from(stores).where(eq(stores.id, cart.store.id));
    if (!store) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cart or item not found');
    const slots = deliverySlots(cairoMinuteOfDay(new Date()), { opensAt: hhmm(store.opensAt), closesAt: hhmm(store.closesAt), closedNow: store.closedNow });
    const base = { cartId: cart.id, mode: cart.mode, count: cart.count, itemsTotal: cart.total, slots, cart, store };
    if (cart.mode === 'pickup') {
      return { ...base, deliveryFee: 0, total: cart.total, distanceKm: null, address: null, spot: null };
    }
    if (input.addressId === undefined) throw new BadRequestException('addressId is required for a delivery');
    const address = await this.addresses.findOf(userId, input.addressId);
    if (store.zoneId !== null && store.zoneId !== address.zoneId) throw badAddress();
    const spot = input.location ? { lat: input.location.lat, lng: input.location.lng } : { lat: address.lat, lng: address.lng };
    if (input.location) {
      const { zone } = await this.addresses.check(spot);
      if (!zone || zone.id !== address.zoneId) throw badAddress();
    }
    const from = locationOf(store);
    if (!from) throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_NO_STORE_LOCATION', 'The store has no location on the map');
    const km = distanceKm(from, spot);
    const deliveryFee = deliveryFeeFor(km, await this.settings.delivery(tx));
    return { ...base, deliveryFee, total: cents(cart.total + deliveryFee), distanceKm: km, address, spot };
  }

  private async customerOrder(tx: Db | Tx, id: number): Promise<CustomerOrder> {
    const [row] = await tx
      .select({ order: orders, store: { id: stores.id, name: stores.name, logo: stores.logo } })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.id, id));
    const counts = await this.counts(tx, [id]);
    return toCustomerOrder(row!.order, row!.store, counts.get(id) ?? 0);
  }

  /** How many items each order holds. */
  private async counts(tx: Db | Tx, ids: number[]): Promise<Map<number, number>> {
    if (!ids.length) return new Map();
    const lines = await tx.select({ orderId: orderLines.orderId, quantity: orderLines.quantity }).from(orderLines).where(inArray(orderLines.orderId, ids));
    const counts = new Map<number, number>();
    for (const { orderId, quantity } of lines) counts.set(orderId, (counts.get(orderId) ?? 0) + quantity);
    return counts;
  }
}

/** The address as the store and the delivery man read it: "شارع 2، مبنى 2، الدور 3، شقه 2، temp". */
const addressText = (a: AddressRow) =>
  [a.street, a.building, a.floor && `الدور ${a.floor}`, a.apartment, a.landmark].filter((part) => part?.trim()).join('، ');

const myOrderNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'You have no order with this id');

const toOrderLine = (l: OrderLineRow): OrderLine => ({
  name: l.name,
  options: l.options,
  removedIngredients: l.removedIngredients,
  image: l.image,
  unitPrice: l.unitPrice,
  quantity: l.quantity,
});

const orderNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No order of this store has this id');

function toPartnerOrder(row: OrderRow, count: number): PartnerOrder {
  return {
    id: row.id,
    code: codeOf(row.id),
    status: row.status,
    mode: row.mode,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    count,
    itemsTotal: row.itemsTotal,
    total: row.total,
    note: row.note,
    paymentMethod: 'cash',
    createdAt: row.createdAt.toISOString(),
  };
}

function toCustomerOrder(row: OrderRow, store: CustomerOrder['store'], count: number): CustomerOrder {
  return {
    id: row.id,
    code: codeOf(row.id),
    status: row.status,
    store,
    mode: row.mode,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    count,
    itemsTotal: row.itemsTotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
  };
}

import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  type AdminOrder,
  canReorder,
  type CustomerOrderDetails,
  customerStatusNotice,
  notice,
  type OrderLine,
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
  pointsPay,
  pointsEarned,
  earnBase,
  deliveryDiscount,
  productSaving,
  storeItemsBase,
  type OrderRequest,
  type PharmacyRequest,
  requestComplete,
  requestPricedNotice,
} from '@tawsela/shared';
import { and, asc, count as countRows, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { AddressRow } from '../addresses/addresses.schema.js';
import { AddressesService } from '../addresses/addresses.service.js';
import { CartService } from '../cart/cart.service.js';
import { carts } from '../cart/cart.schema.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { type StoreRow, stores } from '../catalog/catalog.schema.js';
import { cairoMinuteOfDay, locationOf, storeIsOpen } from '../catalog/store-view.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { ratings } from '../support/support.schema.js';
import { users } from '../users/users.schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { PointsService } from '../points/points.service.js';
import { InvitesService } from '../invites/invites.service.js';
import { type AppliedCoupon, OffersService } from '../offers/offers.service.js';
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
  /** The cart paid for; null for a pharmacy request. */
  cart: CustomerCart | null;
  request: PharmacyRequest | null;
  store: StoreRow;
  address: AddressRow | null;
  spot: LatLng | null;
  /** The code typed, once it passed its checks. */
  applied: AppliedCoupon | null;
}

/** Checkout and orders (contract §8.7, §11 الطلبات). Cash on delivery only (§15.1 #2). */
@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly carts: CartService,
    private readonly addresses: AddressesService,
    private readonly settings: SettingsService,
    private readonly live: OrdersGateway,
    private readonly notices: NotificationsService,
    private readonly wallet: WalletService,
    private readonly points: PointsService,
    private readonly invites: InvitesService,
    private readonly offers: OffersService,
  ) {}

  quote(userId: number, input: CheckoutQuoteInput): Promise<CheckoutQuote> {
    return this.db.transaction(async (tx) => {
      const { cart: _cart, request: _request, store: _store, address: _address, spot: _spot, applied: _applied, ...quote } = await this.bill(tx, userId, input);
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
      const [placed] = await tx
        .select({ id: orders.id, mode: orders.mode, addressId: orders.addressId, scheduledFor: orders.scheduledFor })
        .from(orders)
        .where(and(eq(orders.customerId, userId), eq(orders.requestId, input.requestId)));
      if (placed) {
        // The same tap again gives the order back; a retry that changed the time or the address
        // would otherwise be told the order went as asked.
        const slot = placed.scheduledFor === null ? null : cairoMinuteOfDay(placed.scheduledFor);
        const sameSlot = input.slot === null ? slot === null : slot !== null && slot === input.slot % 1440;
        // A pickup never used an address, so one sent with it does not count.
        const sameAddress = placed.mode === 'pickup' || (placed.addressId ?? undefined) === input.addressId;
        if (!sameSlot || !sameAddress) {
          throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_ALREADY_PLACED', 'This order was already placed with another time or address; see طلباتي');
        }
        return { order: await this.customerOrder(tx, placed.id) };
      }

      // The cart was emptied, or ordered from another phone, since the checkout screen loaded.
      if (input.cartId !== undefined) {
        const [cart] = await tx.select({ id: carts.id }).from(carts).where(and(eq(carts.id, input.cartId), eq(carts.userId, userId)));
        if (!cart) {
          throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_CART_CHANGED', 'The cart changed since the checkout screen loaded');
        }
      }
      // A pharmacy request has no items price yet, so points are not offered on it [Owner, 2026-11-26].
      if (input.request && (input.expectedPointsSpent ?? 0) > 0) throw new BadRequestException('Points do not pay a pharmacy request');
      const bill = await this.bill(tx, userId, input, true);
      if (bill.total !== input.expectedTotal) {
        throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_TOTAL_CHANGED', 'The bill changed; check it again');
      }
      if (input.slot !== null && !bill.slots.includes(input.slot)) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'CHECKOUT_SLOT', 'This delivery time is no longer offered');
      }
      // "رصيد المحفظة" pays what it holds, up to the total; a balance that moved since the screen
      // loaded is a changed bill. The customer's row is locked, so nothing spends it meanwhile.
      const expectedWalletPaid = input.expectedWalletPaid ?? 0;
      const plan = expectedWalletPaid > 0 ? await this.wallet.plan(tx, userId, bill.store.vertical, bill.total) : undefined;
      const walletPaid = plan?.paid ?? 0;
      if (walletPaid !== expectedWalletPaid) {
        throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_TOTAL_CHANGED', 'The wallet balance changed; check the bill again');
      }
      // Then "نقاطي" on what the wallet left [Owner, 2026-11-26: wallet first], with the same check.
      const expectedPointsSpent = input.expectedPointsSpent ?? 0;
      const spent = expectedPointsSpent > 0 ? pointsPay(bill.pointsBalance, cents(bill.total - walletPaid), bill.points) : { points: 0, value: 0 };
      if (spent.points !== expectedPointsSpent) {
        throw new ApiException(HttpStatus.CONFLICT, 'CHECKOUT_TOTAL_CHANGED', 'The points or their rules changed; check the bill again');
      }

      const now = new Date();
      now.setSeconds(0, 0);
      const scheduledFor = input.slot === null ? null : new Date(now.getTime() + (input.slot - cairoMinuteOfDay(now)) * 60_000);
      const rule = await this.settings.delivery(tx);
      const payoutOption = bill.store.payoutOption ?? rule.payoutOption;
      const appPercent = bill.store.appPercent ?? rule.appPercent;
      const { address, spot, applied } = bill;
      // Who pays each discount [Owner, 2026-11-26: set per offer]: the store is paid on its full prices
      // less what it pays itself. A store bringing its own orders keeps no fee to waive.
      const appProductSaving = (bill.cart?.lines ?? []).reduce((n, l) => (l.product.discountPaidBy === 'app' ? n + productSaving(l.product) * l.quantity : n), 0);
      const waived = cents(bill.usualDeliveryFee - bill.deliveryFee);
      const delivery = waived > 0 ? { discount: waived, paidBy: bill.store.freeDeliveryPaidBy } : null;
      const coupon = applied ? { discount: applied.discount, paidBy: applied.row.paidBy } : null;
      const base = storeItemsBase({
        itemsTotal: bill.itemsTotal,
        appProductSaving: cents(appProductSaving),
        coupon,
        delivery: bill.store.deliveredBy === 'platform' ? delivery : null,
      });
      // "اطلب دليفري" has nothing to prepare: its order goes straight to the delivery men [Owner, 2026-11-26].
      // Only when the app's delivery men carry it: a store delivering itself is never announced to them.
      const straightToDrivers = bill.store.vertical === 'courier' && bill.mode === 'delivery' && bill.store.deliveredBy === 'platform';
      const status: OrderStatus = straightToDrivers ? 'ready' : 'pending_review';
      const [created] = await tx
        .insert(orders)
        .values({
          customerId: userId,
          status,
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
          note: bill.cart?.note ?? '',
          requestKind: bill.request?.kind ?? null,
          requestImage: bill.request?.image ?? null,
          requestText: bill.request ? bill.request.text.trim() : null,
          itemsTotal: bill.itemsTotal,
          deliveryFee: bill.deliveryFee,
          deliveryDiscount: waived,
          deliveryPaidBy: delivery?.paidBy ?? null,
          couponId: applied?.row.id ?? null,
          couponCode: applied?.row.code ?? null,
          couponDiscount: coupon?.discount ?? 0,
          couponPaidBy: coupon?.paidBy ?? null,
          appProductSaving: cents(appProductSaving),
          total: bill.total,
          walletPaid,
          invitePaid: cents((plan?.credits ?? []).reduce((n, c) => n + c.amount, 0)),
          pointsSpent: spent.points,
          pointsPaid: spent.value,
          // Points are earned on what the items cost the customer (§8.16): less the code and the points.
          pointsEarned: pointsEarned(earnBase(cents(bill.itemsTotal - (coupon?.discount ?? 0)), spent.value), bill.points.earnEvery),
          payoutOption,
          appPercent,
          ...payout(base, payoutOption, appPercent),
        })
        .$returningId();
      const orderId = created!.id;
      await this.wallet.pay(tx, userId, orderId, plan);
      await this.points.spend(tx, userId, orderId, spent.points);
      if (applied) await this.offers.use(tx, applied.row.id, userId, orderId);
      if (bill.cart) await tx.insert(orderLines).values(
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
      await tx.insert(orderEvents).values({ orderId, status, byUserId: userId });
      if (bill.cartId !== null) await this.carts.clear(tx, bill.cartId);
      newId = orderId;
      return { order: await this.customerOrder(tx, orderId) };
    });
    // Only once it is saved, and only the first time: the store's phones ring for it (§9). The order
    // stands either way, so a failure here is logged, never answered as a failed order (the store's
    // lists still show it).
    if (newId !== undefined) {
      const id = newId;
      const told = placed.order.status === 'ready' ? this.offerToDrivers(id, placed.order.store.id) : this.announce(placed.order, id);
      await told.catch((err: unknown) => this.log.warn(`New order ${id} not announced: ${String(err)}`));
    }
    return placed;
  }

  /**
   * What follows an order's delivery, by the store or its delivery man, in the same save: the points it
   * earns (§8.16) and, for a friend's first order, the inviter's reward (§8.17).
   */
  async delivered(tx: Tx, row: Pick<OrderRow, 'id' | 'customerId' | 'pointsEarned'>): Promise<void> {
    await this.points.earn(tx, row.customerId, row.id, row.pointsEarned);
    await this.invites.onDelivered(tx, row.customerId);
  }

  /** Every working delivery man is offered the order at once (§10). */
  private async offerToDrivers(id: number, storeId: number): Promise<void> {
    this.live.toDrivers(DRIVER_SOCKET_EVENTS.offer, { id });
    const [named] = await this.db.select({ name: stores.name }).from(stores).where(eq(stores.id, storeId));
    const code = codeOf(id);
    this.notices.tell(await this.notices.workingDrivers(), (locale) => notice('offer', locale, { code, store: named?.name ?? '' }), { path: '/driver', keep: false });
  }

  private async announce(order: CustomerOrder, id: number): Promise<void> {
    const [card] = await this.partnerCards(eq(orders.id, id));
    this.live.toStore(order.store.id, ORDER_SOCKET_EVENTS.placed, { order: card });
    const code = order.code;
    this.notices.tell(await this.notices.storePartners(order.store.id), (locale) => notice('new_order', locale, { code }), { path: `/partner-order/${id}`, keep: true });
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
  async partnerStep(store: Pick<StoreRow, 'id' | 'deliveredBy'>, userId: number, id: number, action: PartnerAction, price?: number): Promise<PartnerOrderDetails> {
    const { status, row } = await this.db.transaction(async (tx) => {
      const [found] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.storeId, store.id))).for('update');
      if (!found) throw orderNotFound();
      let row = found;
      const next = nextStatus(row.status, action, row.mode, store.deliveredBy);
      if (!next) throw new ApiException(HttpStatus.CONFLICT, 'ORDER_STATUS', `The order is ${row.status}; it cannot be moved by "${action}"`);
      const pricing = next === 'preparing' && row.requestKind !== null;
      if (price !== undefined && !pricing) throw new BadRequestException('A price is set only when accepting a pharmacy request');
      if (pricing) {
        if (price === undefined) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'ORDER_PRICE_REQUIRED', 'Accepting a pharmacy request needs its price');
        row = { ...row, ...(await this.priced(tx, row, price)) };
      }
      await tx.update(orders).set({ status: next }).where(eq(orders.id, id));
      await tx.insert(orderEvents).values({ orderId: id, status: next, byUserId: userId });
      // A rejected order's wallet money goes back at once [Owner, 2026-11-26].
      if (next === 'rejected' || next === 'cancelled') {
        await this.wallet.refund(tx, row.customerId, id, row.walletPaid);
        await this.points.refund(tx, row.customerId, id, row.pointsSpent);
        await this.offers.release(tx, id);
      }
      // Points come once the order is delivered (§8.16).
      if (next === 'delivered') await this.delivered(tx, row);
      return { status: next, row };
    });
    this.live.orderChanged(row, { id, status });
    const code = codeOf(id);
    const pricedNow = status === 'preparing' && row.requestKind !== null;
    this.notices.tell(
      [row.customerId],
      (locale) => (pricedNow ? requestPricedNotice(code, row.itemsTotal, row.total, locale) : customerStatusNotice(status, row.mode, code, locale)),
      { path: `/order/${id}`, keep: true },
    );
    if (status === 'preparing' && row.mode === 'delivery' && store.deliveredBy === 'platform') await this.offerToDrivers(id, store.id);
    if (row.driverId !== null) {
      this.live.toDriver(row.driverId, DRIVER_SOCKET_EVENTS.order, { id });
      if (status === 'ready') this.notices.tell([row.driverId], (locale) => notice('order_ready', locale, { code }), { path: `/driver-order/${id}`, keep: true });
    }
    return this.partnerDetails(store.id, id);
  }

  /**
   * A pharmacy request's items price, set by the pharmacy on "قبول" (§8.11): the total, who gets what
   * and the points it earns follow from it, as for an order of products. The wallet keeps what it
   * paid; the rest is cash.
   */
  private async priced(tx: Tx, row: OrderRow, price: number) {
    const delivery = row.deliveryDiscount > 0 && row.deliveryPaidBy ? { discount: row.deliveryDiscount, paidBy: row.deliveryPaidBy } : null;
    const [store] = await tx.select({ deliveredBy: stores.deliveredBy }).from(stores).where(eq(stores.id, row.storeId));
    const base = storeItemsBase({ itemsTotal: price, appProductSaving: 0, coupon: null, delivery: store?.deliveredBy === 'platform' ? delivery : null });
    const { earnEvery } = await this.points.settings(tx);
    const values = {
      itemsTotal: price,
      total: cents(price + row.deliveryFee),
      pointsEarned: pointsEarned(earnBase(price, 0), earnEvery),
      pricedAt: new Date(),
      ...payout(base, row.payoutOption, row.appPercent),
    };
    await tx.update(orders).set(values).where(eq(orders.id, row.id));
    return values;
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

  /** "اطلب تاني" (§8.8): a finished order's lines back in that store's cart, with the same choices. */
  async reorder(userId: number, id: number): Promise<ReorderResult> {
    const [order] = await this.db.select().from(orders).where(and(eq(orders.id, id), eq(orders.customerId, userId)));
    if (!order) throw myOrderNotFound();
    if (!canReorder(order.status)) {
      throw new ApiException(HttpStatus.CONFLICT, 'ORDER_STATUS', `The order is ${order.status}; it can be ordered again once it is over`);
    }
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(asc(orderLines.id));
    // A line placed before choices were kept by id (migration 0013) that had choices is left out:
    // added plain, it would come back without them.
    const lostChoices = (l: (typeof lines)[number]) => (l.optionIds === null || l.removedIngredientIds === null) && (l.options.length > 0 || l.removedIngredients.length > 0);
    const items = lines.flatMap((l) =>
      l.productId === null || lostChoices(l)
        ? []
        : [{ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds ?? [], removedIngredientIds: l.removedIngredientIds ?? [] }],
    );
    if (!items.length) throw new ApiException(HttpStatus.CONFLICT, 'CART_ITEM_UNAVAILABLE', 'An item or its choices are unavailable');
    const { cart, skipped } = await this.carts.reorder(userId, order.storeId, items);
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

  /**
   * The bill for the customer's ready cart: the distance fee for a delivery (none for a pickup or a
   * free delivery), less the code [Owner, 2026-11-26: the code first, then the wallet and points].
   * Placing (`lock`) locks the code's row.
   */
  private async bill(tx: Tx, userId: number, input: CheckoutQuoteInput, lock = false): Promise<Bill> {
    if ((input.cartId === undefined) === (input.request === undefined)) throw new BadRequestException('Send either cartId or request');
    const { cart, request, store } = input.request ? await this.requestSource(tx, input.request) : await this.cartSource(tx, userId, input.cartId!);
    if (request && input.couponCode) throw new BadRequestException('A code does not apply to a pharmacy request');
    const itemsTotal = cart?.total ?? 0;
    const mode = cart?.mode ?? 'delivery';
    const slots = deliverySlots(cairoMinuteOfDay(new Date()), { opensAt: hhmm(store.opensAt), closesAt: hhmm(store.closesAt), closedNow: store.closedNow });
    // What the wallet can pay on this order: its regular money and the invite money this store may take.
    const walletBalance = (await this.wallet.plan(tx, userId, store.vertical)).paid;
    const pointsBalance = await this.points.balanceOf(tx, userId);
    const points = await this.points.settings(tx);
    const applied = input.couponCode ? await this.offers.apply(tx, userId, store.id, itemsTotal, input.couponCode, lock) : null;
    const couponOff = applied?.discount ?? 0;
    const coupon = applied ? { code: applied.row.code, title: applied.row.title, discount: couponOff } : null;
    const base = {
      cartId: cart?.id ?? null, mode, count: cart?.count ?? 0, itemsTotal, slots, walletBalance, pointsBalance, points, cart, request, store, applied, coupon,
    };
    if (mode === 'pickup') {
      return { ...base, deliveryFee: 0, usualDeliveryFee: 0, total: cents(itemsTotal - couponOff), distanceKm: null, address: null, spot: null };
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
    const usualDeliveryFee = deliveryFeeFor(km, await this.settings.delivery(tx));
    // A request's items price is unknown, so a free delivery from an items amount never applies to it.
    const deliveryFee = request ? usualDeliveryFee : cents(usualDeliveryFee - deliveryDiscount(store.freeDeliveryFrom, itemsTotal, usualDeliveryFee));
    return { ...base, deliveryFee, usualDeliveryFee, total: cents(itemsTotal + deliveryFee - couponOff), distanceKm: km, address, spot };
  }

  /** The customer's ready cart and its store. */
  private async cartSource(tx: Tx, userId: number, cartId: number) {
    const cart = await this.carts.ready(tx, userId, cartId);
    const [store] = await tx.select().from(stores).where(eq(stores.id, cart.store.id));
    if (!store) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cart or item not found');
    return { cart, request: null, store };
  }

  /**
   * A pharmacy request (§8.11): an open pharmacy, and a photo or a text. It has no minimum order,
   * since its price comes later.
   */
  private async requestSource(tx: Tx, input: PharmacyRequest & { storeId: number }) {
    if (!requestComplete(input)) throw new BadRequestException('Add a photo or write the request');
    const [store] = await tx.select().from(stores).where(eq(stores.id, input.storeId));
    if (!store?.active || store.vertical !== 'pharmacy') throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No pharmacy has this id');
    if (!storeIsOpen(store, new Date())) throw new ApiException(HttpStatus.CONFLICT, 'CART_STORE_CLOSED', 'The store is closed');
    const request: PharmacyRequest = { kind: input.kind, image: input.image, text: input.text };
    return { cart: null, request, store };
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
    couponDiscount: row.couponDiscount,
    total: row.total,
    walletPaid: row.walletPaid,
    invitePaid: row.invitePaid,
    pointsPaid: row.pointsPaid,
    note: row.note,
    paymentMethod: 'cash',
    createdAt: row.createdAt.toISOString(),
    request: requestOf(row),
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
    couponDiscount: row.couponDiscount,
    couponCode: row.couponCode,
    total: row.total,
    walletPaid: row.walletPaid,
    invitePaid: row.invitePaid,
    pointsSpent: row.pointsSpent,
    pointsPaid: row.pointsPaid,
    createdAt: row.createdAt.toISOString(),
    request: requestOf(row),
  };
}

/** A pharmacy request's photo and text, and whether the pharmacy has priced it (§8.11). */
function requestOf(row: OrderRow): OrderRequest | null {
  if (row.requestKind === null) return null;
  return { kind: row.requestKind, image: row.requestImage, text: row.requestText ?? '', priced: row.pricedAt !== null };
}

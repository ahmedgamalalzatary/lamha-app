import { CART_MODES, CART_NOTE_LIMIT, COUPON, ORDER_STATUSES, PAID_BY, PAYOUT_OPTIONS, PHARMACY_REQUEST_KINDS, PHARMACY_REQUEST_TEXT_LIMIT } from '@tawsela/shared';
import { char, datetime, decimal, index, int, json, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { addresses, degrees } from '../addresses/addresses.schema.js';
import { products, stores } from '../catalog/catalog.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * A placed order (§8.7, §12). Every amount is fixed when it is placed: later price, fee or payment
 * option changes never touch it. Cash on delivery only for now (§15.1 #2).
 */
export const orders = mysqlTable(
  'orders',
  {
    id: id('id').autoincrement().primaryKey(),
    customerId: id('customer_id').notNull().references(() => users.id),
    storeId: id('store_id').notNull().references(() => stores.id),
    /** The tap of "تنفيذ الطلب" that placed it: the same request twice places one order. */
    requestId: char('request_id', { length: 36 }).notNull(),
    status: mysqlEnum('status', ORDER_STATUSES).notNull().default('pending_review'),
    mode: mysqlEnum('mode', CART_MODES).notNull(),
    /** The saved address it goes to (none for a pickup); the spot is the one confirmed on the map. */
    addressId: id('address_id').references(() => addresses.id, { onDelete: 'set null' }),
    /** The address as it read when placed, for the store and the delivery man. */
    addressText: varchar('address_text', { length: 600 }),
    phone: varchar('phone', { length: 20 }),
    lat: degrees('lat'),
    lng: degrees('lng'),
    distanceKm: decimal('distance_km', { precision: 7, scale: 3, mode: 'number' }),
    /** A later delivery today (§8.7); null is "سيصل خلال 30 دقيقة". */
    scheduledFor: datetime('scheduled_for'),
    note: varchar('note', { length: CART_NOTE_LIMIT }).notNull().default(''),
    /**
     * A pharmacy request (§8.11) instead of products: its photo and text. The items price is 0 until
     * the pharmacy accepts it with one (pricedAt).
     */
    requestKind: mysqlEnum('request_kind', PHARMACY_REQUEST_KINDS),
    requestImage: varchar('request_image', { length: 255 }),
    requestText: varchar('request_text', { length: PHARMACY_REQUEST_TEXT_LIMIT }),
    pricedAt: datetime('priced_at'),
    itemsTotal: money('items_total').notNull(),
    deliveryFee: money('delivery_fee').notNull(),
    /** A free delivery's waived fee (§8.4) and who pays it; 0 and null without one. */
    deliveryDiscount: money('delivery_discount').notNull().default(0),
    deliveryPaidBy: mysqlEnum('delivery_paid_by', PAID_BY),
    /** "وفر على طلبك" (§8.7): the code as it was, its discount and who pays it. */
    couponId: id('coupon_id'),
    couponCode: varchar('coupon_code', { length: COUPON.codeMaxLength }),
    couponDiscount: money('coupon_discount').notNull().default(0),
    couponPaidBy: mysqlEnum('coupon_paid_by', PAID_BY),
    /** Of the items' discounts, what the app pays: the store is paid its full prices (§8.10). */
    appProductSaving: money('app_product_saving').notNull().default(0),
    total: money('total').notNull(),
    /**
     * Paid from the customer's wallet (§8.15); the rest is cash. On a delivery by the app's captains the
     * app owes it to the delivery man [Owner, 2026-11-26].
     */
    walletPaid: money('wallet_paid').notNull().default(0),
    /** Of walletPaid, what invite money paid (§8.17). */
    invitePaid: money('invite_paid').notNull().default(0),
    /** Points spent on it (§8.16) and what they paid; the app owes that cash like the wallet's. */
    pointsSpent: int('points_spent', { unsigned: true }).notNull().default(0),
    pointsPaid: money('points_paid').notNull().default(0),
    /** What it earns, fixed when placed and given once it is delivered. */
    pointsEarned: int('points_earned', { unsigned: true }).notNull().default(0),
    payoutOption: mysqlEnum('payout_option', PAYOUT_OPTIONS).notNull(),
    appPercent: decimal('app_percent', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    appShare: money('app_share').notNull(),
    storeGets: money('store_gets').notNull(),
    storeFromDriver: money('store_from_driver').notNull(),
    /** The delivery man who took it (§10), or the one the admin assigned. */
    driverId: id('driver_id').references(() => users.id),
    /** When he took it (or the admin gave it to him), and what he earns on it, fixed then (§8.7, §10). */
    takenAt: datetime('taken_at'),
    driverFee: money('driver_fee'),
    /** Once delivered: his minutes per km and the speed points they earned. */
    minutesPerKm: decimal('minutes_per_km', { precision: 7, scale: 2, mode: 'number' }),
    driverPoints: int('driver_points', { unsigned: true }).notNull().default(0),
    /** When he tapped وصلت للمتجر. */
    atStoreAt: datetime('at_store_at'),
    /** The customer closed the rating popup (✕): it is not shown again for this order (§8.8). */
    ratingSkippedAt: datetime('rating_skipped_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('orders_driver_idx').on(t.driverId, t.status),
    uniqueIndex('orders_request_idx').on(t.customerId, t.requestId),
    index('orders_customer_idx').on(t.customerId, t.createdAt),
    index('orders_store_idx').on(t.storeId, t.createdAt),
    index('orders_status_idx').on(t.status, t.createdAt),
  ],
);

/** A line as it was ordered: the product's name, choices and price at that moment. */
export const orderLines = mysqlTable(
  'order_lines',
  {
    id: id('id').autoincrement().primaryKey(),
    orderId: id('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: id('product_id').references(() => products.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 120 }).notNull(),
    /** The chosen options' names ("ربع كيلو") and the struck-out ingredients ("بدون: بصل"). */
    options: json('options').$type<string[]>().notNull(),
    removedIngredients: json('removed_ingredients').$type<string[]>().notNull(),
    /** The same choices by id, for "اطلب تاني" (§8.8); null on lines placed before they were kept. */
    optionIds: json('option_ids').$type<number[]>(),
    removedIngredientIds: json('removed_ingredient_ids').$type<number[]>(),
    image: varchar('image', { length: 255 }),
    unitPrice: money('unit_price').notNull(),
    quantity: int('quantity', { unsigned: true }).notNull(),
  },
  (t) => [index('order_lines_order_idx').on(t.orderId)],
);

/** The status history: one row per change, the first when the order is placed. */
export const orderEvents = mysqlTable(
  'order_events',
  {
    id: id('id').autoincrement().primaryKey(),
    orderId: id('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ORDER_STATUSES).notNull(),
    byUserId: id('by_user_id').references(() => users.id),
    at: timestamp('at').notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export type OrderRow = typeof orders.$inferSelect;
export type OrderLineRow = typeof orderLines.$inferSelect;

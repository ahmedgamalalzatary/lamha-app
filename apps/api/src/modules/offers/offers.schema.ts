import { BANNER_OPENS, BANNER_PLACES, COUPON, COUPON_KINDS, PAID_BY } from '@tawsela/shared';
import { boolean, datetime, decimal, index, int, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { stores } from '../catalog/catalog.schema.js';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * A code (§8.4 قسائمي, §8.7 "وفر على طلبك"), set by the admin only [Owner, 2026-11-26]. `codeKey`
 * is the code as matched (normalizeCode), so "Black Friday" and "black friday" are one code.
 */
export const coupons = mysqlTable(
  'coupons',
  {
    id: id('id').autoincrement().primaryKey(),
    code: varchar('code', { length: COUPON.codeMaxLength }).notNull(),
    codeKey: varchar('code_key', { length: COUPON.codeMaxLength }).notNull(),
    title: varchar('title', { length: COUPON.titleMaxLength }).notNull(),
    /** null: every store. */
    storeId: id('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', COUPON_KINDS).notNull(),
    value: money('value').notNull(),
    maxDiscount: money('max_discount'),
    minOrder: money('min_order').notNull().default(0),
    startsAt: datetime('starts_at'),
    endsAt: datetime('ends_at'),
    perCustomer: id('per_customer').notNull().default(1),
    totalLimit: id('total_limit'),
    paidBy: mysqlEnum('paid_by', PAID_BY).notNull().default('app'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('coupons_code_idx').on(t.codeKey), index('coupons_store_idx').on(t.storeId)],
);

export type CouponRow = typeof coupons.$inferSelect;

/** A code used on an order. A rejected or cancelled order deletes its use, so the code may be used again. */
export const couponUses = mysqlTable(
  'coupon_uses',
  {
    id: id('id').autoincrement().primaryKey(),
    couponId: id('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: id('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('coupon_uses_coupon_idx').on(t.couponId, t.userId)],
);

/** A home banner (§8.2), in the admin's order: a carousel slide, or a rail over the store's products. */
export const banners = mysqlTable(
  'banners',
  {
    id: id('id').autoincrement().primaryKey(),
    image: varchar('image', { length: 255 }).notNull(),
    place: mysqlEnum('place', BANNER_PLACES).notNull(),
    storeId: id('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    opens: mysqlEnum('opens', BANNER_OPENS).notNull().default('store'),
    sortOrder: int('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('banners_place_idx').on(t.place, t.sortOrder)],
);

export type BannerRow = typeof banners.$inferSelect;

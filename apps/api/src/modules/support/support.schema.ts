import { RATING_TEXT_LIMIT, type RatingTag, TICKET_STATUSES, TICKET_TEXT_LIMIT, TICKET_TYPES } from '@tawsela/shared';
import { datetime, index, int, json, mysqlEnum, mysqlTable, smallint, timestamp, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { stores } from '../catalog/catalog.schema.js';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });

/** The customer's rating of a delivered order (§8.8): one per order. The store's average comes from these. */
export const ratings = mysqlTable(
  'ratings',
  {
    id: id('id').autoincrement().primaryKey(),
    orderId: id('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: id('customer_id').notNull().references(() => users.id),
    storeId: id('store_id').notNull().references(() => stores.id),
    stars: tinyint('stars', { unsigned: true }).notNull(),
    tags: json('tags').$type<RatingTag[]>().notNull(),
    text: varchar('text', { length: RATING_TEXT_LIMIT }).notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('ratings_store_idx').on(t.storeId), index('ratings_created_idx').on(t.createdAt)],
);

/** تقديم شكوى and تقديم مقترح (§8.14): the admin reads them, calls or WhatsApps, and marks them done [Owner]. */
export const tickets = mysqlTable(
  'tickets',
  {
    id: id('id').autoincrement().primaryKey(),
    customerId: id('customer_id').notNull().references(() => users.id),
    type: mysqlEnum('type', TICKET_TYPES).notNull(),
    /** A complaint about a past order (طلب سابق); null for عامة and suggestions. */
    orderId: id('order_id').references(() => orders.id, { onDelete: 'set null' }),
    text: varchar('text', { length: TICKET_TEXT_LIMIT }).notNull(),
    status: mysqlEnum('status', TICKET_STATUSES).notNull().default('open'),
    doneAt: datetime('done_at'),
    doneById: id('done_by_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('tickets_status_idx').on(t.status, t.createdAt)],
);

/** "تواصل معنا": the numbers the admin lists, in order [Owner]. */
export const supportPhones = mysqlTable('support_phones', {
  id: id('id').autoincrement().primaryKey(),
  label: varchar('label', { length: 40 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  sortOrder: smallint('sort_order', { unsigned: true }).notNull(),
});

export type TicketRow = typeof tickets.$inferSelect;

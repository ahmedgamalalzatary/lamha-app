import { POINTS_REASONS, WALLET_KINDS, WALLET_NOTE_LIMIT } from '@tawsela/shared';
import { decimal, index, int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });

/**
 * الإعدادات › النقاط (§8.16, §11 A21): one row (id 1). Two settings, not one rate [Owner, 2026-11-26];
 * the defaults are ours [Derived]. The migration inserts the row.
 */
export const pointsSettings = mysqlTable('points_settings', {
  id: id('id').primaryKey(),
  earnEvery: decimal('earn_every', { precision: 10, scale: 2, mode: 'number' }).notNull().default(10),
  pointValue: decimal('point_value', { precision: 10, scale: 4, mode: 'number' }).notNull().default(0.1),
  minimum: id('minimum').notNull().default(100),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export type PointsSettingsRow = typeof pointsSettings.$inferSelect;

/** المكتسبة and المنفقة: every movement; users.points_balance is the sum, changed in the same save. */
export const pointsTransactions = mysqlTable(
  'points_transactions',
  {
    id: id('id').autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', WALLET_KINDS).notNull(),
    reason: mysqlEnum('reason', POINTS_REASONS).notNull(),
    points: id('points').notNull(),
    note: varchar('note', { length: WALLET_NOTE_LIMIT }).notNull().default(''),
    orderId: id('order_id').references(() => orders.id, { onDelete: 'set null' }),
    byUserId: id('by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('points_transactions_user_idx').on(t.userId, t.id)],
);

export type PointsTransactionRow = typeof pointsTransactions.$inferSelect;

import type { WeekSchedule } from '@tawsela/shared';
import { datetime, index, int, json, mysqlTable, primaryKey, smallint, timestamp } from 'drizzle-orm/mysql-core';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const minutes = (name: string, value: number) => smallint(name, { unsigned: true }).notNull().default(value);

/**
 * The drivers' rules (§10, §15.1 #5): one row (id 1) with the global week and the admin's numbers.
 * The migration inserts it with a week without shifts and these defaults.
 */
export const driverSettings = mysqlTable('driver_settings', {
  id: id('id').primaryKey(),
  schedule: json('schedule').$type<WeekSchedule>().notNull(),
  startEarlyMinutes: minutes('start_early_minutes', 30),
  startLateMinutes: minutes('start_late_minutes', 15),
  extendMinutes: minutes('extend_minutes', 60),
  extendMax: minutes('extend_max', 3),
  offerSeconds: minutes('offer_seconds', 60),
  skipWarn: minutes('skip_warn', 2),
  skipBlock: minutes('skip_block', 3),
  blockMinutes: minutes('block_minutes', 15),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/** A delivery man's own state: his week (null follows the global one), skips in a row and a block. */
export const drivers = mysqlTable('drivers', {
  userId: id('user_id')
    .primaryKey()
    .references(() => users.id),
  schedule: json('schedule').$type<WeekSchedule>(),
  skipsInRow: smallint('skips_in_row', { unsigned: true }).notNull().default(0),
  blockedUntil: datetime('blocked_until'),
});

/** A shift he worked: the scheduled times, moved by each extension; ended early when he ends it. */
export const shifts = mysqlTable(
  'shifts',
  {
    id: id('id').autoincrement().primaryKey(),
    driverId: id('driver_id')
      .notNull()
      .references(() => users.id),
    startsAt: datetime('starts_at').notNull(),
    endsAt: datetime('ends_at').notNull(),
    extensions: smallint('extensions', { unsigned: true }).notNull().default(0),
    startedAt: datetime('started_at').notNull(),
    /** The admin, when he started it for him after the window closed. */
    startedById: id('started_by_id').references(() => users.id),
    endedAt: datetime('ended_at'),
  },
  (t) => [index('shifts_driver_idx').on(t.driverId, t.startedAt)],
);

/** An offer he pressed "تخطي" on: he does not see it again. */
export const orderSkips = mysqlTable(
  'order_skips',
  {
    orderId: id('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    driverId: id('driver_id')
      .notNull()
      .references(() => users.id),
    at: timestamp('at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.driverId] })],
);

export type DriverSettingsRow = typeof driverSettings.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type ShiftRow = typeof shifts.$inferSelect;

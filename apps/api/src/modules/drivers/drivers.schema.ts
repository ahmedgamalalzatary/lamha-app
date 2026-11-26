import { FINE_REASON_LIMIT, type SpeedLevel, type WeekSchedule } from '@tawsela/shared';
import { datetime, decimal, index, int, json, mysqlTable, primaryKey, smallint, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const minutes = (name: string, value: number) => smallint(name, { unsigned: true }).notNull().default(value);
const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

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
  /** Speed points by minutes per km (§10); null is none yet. */
  speedLevels: json('speed_levels').$type<SpeedLevel[]>(),
  /** What a speed point is worth in ج.م. */
  pointValue: money('point_value').notNull().default(0),
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
  /** His own delivery fee rule for his earnings (§8.7): all three or none. */
  baseFee: money('base_fee'),
  baseKm: money('base_km'),
  perKm: money('per_km'),
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

/** الخصومات والغرامات: the admin's fines, with the reason the delivery man sees. */
export const driverFines = mysqlTable(
  'driver_fines',
  {
    id: id('id').autoincrement().primaryKey(),
    driverId: id('driver_id')
      .notNull()
      .references(() => users.id),
    orderId: id('order_id').references(() => orders.id, { onDelete: 'set null' }),
    amount: money('amount').notNull(),
    reason: varchar('reason', { length: FINE_REASON_LIMIT }).notNull(),
    byId: id('by_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('driver_fines_driver_idx').on(t.driverId, t.createdAt)],
);

/** "تم الصرف": speed points the admin paid him in cash, at that day's point value. */
export const driverPayouts = mysqlTable(
  'driver_payouts',
  {
    id: id('id').autoincrement().primaryKey(),
    driverId: id('driver_id')
      .notNull()
      .references(() => users.id),
    points: int('points', { unsigned: true }).notNull(),
    value: money('value').notNull(),
    byId: id('by_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('driver_payouts_driver_idx').on(t.driverId, t.createdAt)],
);

export type DriverSettingsRow = typeof driverSettings.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type ShiftRow = typeof shifts.$inferSelect;

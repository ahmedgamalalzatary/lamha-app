import { ADDRESS_TYPES, type LatLng } from '@tawsela/shared';
import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { users } from '../users/users.schema.js';

/** Degrees with six decimals (about 11 cm). */
export const degrees = (name: string) => decimal(name, { precision: 9, scale: 6, mode: 'number' });

/**
 * A delivery area the admin outlines on the map (§8.9, الإعدادات › المناطق). Zones are switched
 * off, never deleted, so saved addresses and stores keep theirs.
 */
export const zones = mysqlTable('zones', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  polygon: json('polygon').$type<LatLng[]>().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** A customer's saved address (§8.9). Its zone is the one its spot was in when saved. */
export const addresses = mysqlTable(
  'addresses',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    zoneId: int('zone_id', { unsigned: true })
      .notNull()
      .references(() => zones.id),
    type: mysqlEnum('type', ADDRESS_TYPES).notNull(),
    building: varchar('building', { length: 120 }),
    apartment: varchar('apartment', { length: 60 }).notNull(),
    floor: varchar('floor', { length: 30 }),
    street: varchar('street', { length: 160 }),
    landmark: varchar('landmark', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    lat: degrees('lat').notNull(),
    lng: degrees('lng').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('addresses_user_idx').on(t.userId)],
);

export type ZoneRow = typeof zones.$inferSelect;
export type AddressRow = typeof addresses.$inferSelect;

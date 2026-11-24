import { GENDERS, ROLES } from '@tawsela/shared';
import { datetime, int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { stores } from '../catalog/catalog.schema.js';

/**
 * Every account: customers sign up themselves; partners, drivers and admins are created by an admin
 * (contract §2). The phone is the sign-in name. A deleted account keeps its row (orders will point
 * at it) but loses its phone, email, name and password.
 */
export const users = mysqlTable('users', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  role: mysqlEnum('role', ROLES).notNull(),
  /** Local form "01xxxxxxxxx"; "deleted-<id>" once deleted, so the number can sign up again. */
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  /** Required for customers (codes go by email, §8.1); staff may have none. */
  email: varchar('email', { length: 255 }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull().default(''),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  gender: mysqlEnum('gender', GENDERS),
  region: varchar('region', { length: 100 }),
  locale: mysqlEnum('locale', ['ar', 'en']).notNull().default('ar'),
  inviteCode: varchar('invite_code', { length: 12 }).unique(),
  invitedById: int('invited_by_id', { unsigned: true }),
  /** Partners only: the store the account runs (contract §2). */
  storeId: int('store_id', { unsigned: true }).references(() => stores.id),
  disabledAt: datetime('disabled_at'),
  deletedAt: datetime('deleted_at'),
  /**
   * Goes up when every session must end (password reset, disable, deletion, a copied refresh
   * token). Tokens carry the version they were issued under and stop working once it moves on.
   */
  sessionVersion: int('session_version', { unsigned: true }).notNull().default(0),  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

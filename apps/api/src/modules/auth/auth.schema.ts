import { char, datetime, index, int, mysqlEnum, mysqlTable, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { users } from '../users/users.schema.js';

/**
 * Emailed 4-digit codes (contract §8.1). Only a hash of the code is kept. The newest row for a
 * phone and purpose is the one that counts.
 */
export const otpCodes = mysqlTable(
  'otp_codes',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    phone: varchar('phone', { length: 11 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    purpose: mysqlEnum('purpose', ['signup', 'reset']).notNull(),
    codeHash: char('code_hash', { length: 64 }).notNull(),
    attempts: tinyint('attempts', { unsigned: true }).notNull().default(0),
    expiresAt: datetime('expires_at').notNull(),
    consumedAt: datetime('consumed_at'),
    createdAt: datetime('created_at').notNull(),
  },
  (t) => [index('otp_codes_phone_purpose_idx').on(t.phone, t.purpose)],
);

/**
 * One row per issued refresh token; only its SHA-256 is stored. Tokens rotate on every refresh;
 * reusing a rotated token ends every session of the account.
 */
export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: datetime('expires_at').notNull(),
    revokedAt: datetime('revoked_at'),
    createdAt: datetime('created_at').notNull(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

export type OtpRow = typeof otpCodes.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;

import { WALLET_KINDS, WALLET_NOTE_LIMIT, WALLET_REASONS } from '@tawsela/shared';
import { datetime, decimal, index, int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * حركة المحفظة (§8.15, §12): every addition and deduction. users.wallet_balance is the sum, kept
 * beside it and changed in the same transaction, with the customer's row locked.
 */
export const walletTransactions = mysqlTable(
  'wallet_transactions',
  {
    id: id('id').autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', WALLET_KINDS).notNull(),
    reason: mysqlEnum('reason', WALLET_REASONS).notNull(),
    amount: decimal('amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    note: varchar('note', { length: WALLET_NOTE_LIMIT }).notNull().default(''),
    /** The order the money paid for or came back from. */
    orderId: id('order_id').references(() => orders.id, { onDelete: 'set null' }),
    /** The admin who added or deducted it. */
    byUserId: id('by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('wallet_transactions_user_idx').on(t.userId, t.id)],
);

export type WalletTransactionRow = typeof walletTransactions.$inferSelect;

/**
 * Invite money still in the wallet (§8.17), part of users.wallet_balance: the inviter's reward (at
 * most perOrder an order) or the friend's welcome money, each with its own expiry.
 */
export const inviteCredits = mysqlTable(
  'invite_credits',
  {
    id: id('id').autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', ['reward', 'welcome']).notNull(),
    inviteId: id('invite_id').notNull(),
    amount: money('amount').notNull(),
    left: money('left').notNull(),
    perOrder: money('per_order'),
    expiresAt: datetime('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('invite_credits_user_idx').on(t.userId, t.left)],
);

export type InviteCreditRow = typeof inviteCredits.$inferSelect;

/** What each order took from each piece of invite money, so a rejection puts it back. */
export const inviteCreditUses = mysqlTable(
  'invite_credit_uses',
  {
    id: id('id').autoincrement().primaryKey(),
    orderId: id('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    creditId: id('credit_id')
      .notNull()
      .references(() => inviteCredits.id, { onDelete: 'cascade' }),
    amount: money('amount').notNull(),
  },
  (t) => [index('invite_credit_uses_order_idx').on(t.orderId)],
);

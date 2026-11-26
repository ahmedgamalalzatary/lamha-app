import { boolean, datetime, decimal, index, int, mysqlEnum, mysqlTable, timestamp } from 'drizzle-orm/mysql-core';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });
const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * التسويق والعروض › مكافآت الدعوة (§8.17, §11 A17): one row (id 1) with Tawsilty's rules as the
 * defaults [Owner, 2026-11-26]. The migration inserts the row.
 */
export const inviteSettings = mysqlTable('invite_settings', {
  id: id('id').primaryKey(),
  reward: money('reward').notNull().default(300),
  rewardPerOrder: money('reward_per_order').notNull().default(30),
  rewardDays: id('reward_days').notNull().default(30),
  friendReward: money('friend_reward').notNull().default(25),
  friendDays: id('friend_days').notNull().default(30),
  firstOrderDays: id('first_order_days').notNull().default(30),
  monthlyCap: money('monthly_cap').notNull().default(1000),
  expires: boolean('expires').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export type InviteSettingsRow = typeof inviteSettings.$inferSelect;

/** A friend who signed up with a customer's code (one inviter per friend). */
export const invites = mysqlTable(
  'invites',
  {
    id: id('id').autoincrement().primaryKey(),
    inviterId: id('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: id('friend_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['waiting', 'rewarded', 'missed']).notNull().default('waiting'),
    reward: money('reward').notNull().default(0),
    rewardedAt: datetime('rewarded_at'),
    /** When the friend signed up. */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('invites_inviter_idx').on(t.inviterId, t.id)],
);

export type InviteRow = typeof invites.$inferSelect;

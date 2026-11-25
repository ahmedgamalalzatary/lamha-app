import { CAMPAIGN_BODY_LIMIT, CAMPAIGN_TITLE_LIMIT, NOTICE_KINDS } from '@tawsela/shared';
import { datetime, index, int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { zones } from '../addresses/addresses.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });

/** A phone's Expo push token. One token belongs to the account last signed in on that phone. */
export const pushTokens = mysqlTable(
  'push_tokens',
  {
    id: id('id').autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index('push_tokens_user_idx').on(t.userId)],
);

/** الإشعارات: what each account was told, newest first (§8.14). New offers are pushed only, never kept. */
export const notifications = mysqlTable(
  'notifications',
  {
    id: id('id').autoincrement().primaryKey(),
    userId: id('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mysqlEnum('kind', NOTICE_KINDS).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    body: varchar('body', { length: 400 }).notNull(),
    path: varchar('path', { length: 120 }),
    readAt: datetime('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.id)],
);

/** الإشعارات التفاعلية: a campaign sent now to every customer, or those with an address in one zone [Owner]. */
export const campaigns = mysqlTable('campaigns', {
  id: id('id').autoincrement().primaryKey(),
  title: varchar('title', { length: CAMPAIGN_TITLE_LIMIT }).notNull(),
  body: varchar('body', { length: CAMPAIGN_BODY_LIMIT }).notNull(),
  zoneId: id('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  recipients: int('recipients', { unsigned: true }).notNull(),
  sentById: id('sent_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

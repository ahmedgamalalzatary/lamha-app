import { index, int, mysqlTable, primaryKey, timestamp } from 'drizzle-orm/mysql-core';
import { stores } from '../catalog/catalog.schema.js';
import { users } from '../users/users.schema.js';

/** A customer's favourite stores (§8.14 "الخدمات المفضلة", the heart on the store page §8.4). */
export const favoriteStores = mysqlTable(
  'favorite_stores',
  {
    userId: int('user_id', { unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storeId: int('store_id', { unsigned: true })
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.storeId] }), index('favorite_stores_store_idx').on(t.storeId)],
);

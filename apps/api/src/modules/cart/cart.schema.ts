import { CART_MODES, CART_NOTE_LIMIT } from '@tawsela/shared';
import { char, index, int, json, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { products, stores } from '../catalog/catalog.schema.js';
import { users } from '../users/users.schema.js';

const id = (name: string) => int(name, { unsigned: true });

export const carts = mysqlTable('carts', {
  id: id('id').autoincrement().primaryKey(),
  userId: id('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: id('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  note: varchar('note', { length: CART_NOTE_LIMIT }).notNull().default(''),
  mode: mysqlEnum('mode', CART_MODES).notNull().default('delivery'),
}, (t) => [uniqueIndex('carts_user_store_idx').on(t.userId, t.storeId), index('carts_store_idx').on(t.storeId)]);

export const cartLines = mysqlTable('cart_lines', {
  id: id('id').autoincrement().primaryKey(),
  cartId: id('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: id('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  selectionKey: char('selection_key', { length: 64 }).notNull(),
  optionIds: json('option_ids').$type<number[]>().notNull(),
  removedIngredientIds: json('removed_ingredient_ids').$type<number[]>().notNull(),
  quantity: int('quantity', { unsigned: true }).notNull(),
}, (t) => [uniqueIndex('cart_lines_selection_idx').on(t.cartId, t.selectionKey), index('cart_lines_product_idx').on(t.productId)]);

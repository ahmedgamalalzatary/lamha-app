import { DELIVERED_BY, HOME_TILE_ROWS, PAYOUT_OPTIONS, STORE_LAYOUTS, VERTICALS } from '@tawsela/shared';
import {
  type AnyMySqlColumn,
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { degrees, zones } from '../addresses/addresses.schema.js';

const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * A store (مورد, contract §11 الموردين). The admin sets everything; the partner may change the hours,
 * "closed now", the cover and the products (§11.1). Hours are one daily range in Cairo time.
 */
export const stores = mysqlTable('stores', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  vertical: mysqlEnum('vertical', VERTICALS).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  logo: varchar('logo', { length: 255 }),
  cover: varchar('cover', { length: 255 }),
  deliveryMinutes: smallint('delivery_minutes', { unsigned: true }).notNull(),
  minimumOrder: money('minimum_order').notNull().default(0),
  deliveredBy: mysqlEnum('delivered_by', DELIVERED_BY).notNull().default('platform'),
  layout: mysqlEnum('layout', STORE_LAYOUTS).notNull(),
  pickupAllowed: boolean('pickup_allowed').notNull().default(false),
  // Who pays whom (§8.7) and the app's percentage; null follows الإعدادات › رسوم التوصيل والدفع.
  payoutOption: mysqlEnum('payout_option', PAYOUT_OPTIONS),
  appPercent: decimal('app_percent', { precision: 5, scale: 2, mode: 'number' }),
  opensAt: time('opens_at').notNull(),
  closesAt: time('closes_at').notNull(),
  closedNow: boolean('closed_now').notNull().default(false),
  active: boolean('active').notNull().default(true),
  // Customers see the store only when their chosen address is in this zone (§8.9).
  zoneId: int('zone_id', { unsigned: true }).references(() => zones.id),
  lat: degrees('lat'),
  lng: degrees('lng'),
  /** The customers' stars so far (§8.8): the lists show the average, or "جديد" with none. */
  ratingSum: int('rating_sum', { unsigned: true }).notNull().default(0),
  ratingCount: int('rating_count', { unsigned: true }).notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/** Cuisine circles on the restaurants list (§8.3), set by the admin. */
export const cuisines = mysqlTable('cuisines', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  image: varchar('image', { length: 255 }),
  sortOrder: int('sort_order').notNull().default(0),
});

export const storeCuisines = mysqlTable(
  'store_cuisines',
  {
    storeId: int('store_id', { unsigned: true })
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    cuisineId: int('cuisine_id', { unsigned: true })
      .notNull()
      .references(() => cuisines.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.cuisineId] }), index('store_cuisines_cuisine_idx').on(t.cuisineId)],
);

/**
 * A store's menu sections (§8.4): tabs in the restaurant layout, image tiles in the market layout.
 * A sub-category (parent set) is a circle on its main category's page; one level only.
 */
export const storeCategories = mysqlTable(
  'store_categories',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    storeId: int('store_id', { unsigned: true })
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    // No cascade: a main category with sub-categories cannot be deleted, even by a racing request.
    parentId: int('parent_id', { unsigned: true }).references((): AnyMySqlColumn => storeCategories.id),
    name: varchar('name', { length: 120 }).notNull(),
    image: varchar('image', { length: 255 }),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => [index('store_categories_store_idx').on(t.storeId, t.sortOrder), index('store_categories_parent_idx').on(t.parentId)],
);

/** A product; its choices are in product_option_groups, product_options and product_ingredients (§8.5). */
export const products = mysqlTable(
  'products',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    storeId: int('store_id', { unsigned: true })
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    categoryId: int('category_id', { unsigned: true })
      .notNull()
      .references(() => storeCategories.id),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    price: money('price').notNull(),
    unit: varchar('unit', { length: 40 }),
    image: varchar('image', { length: 255 }),
    active: boolean('active').notNull().default(true),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index('products_store_idx').on(t.storeId, t.categoryId, t.sortOrder), index('products_active_idx').on(t.active)],
);

/** An option group on the product sheet (§8.5): "الوزن", مطلوب, "اختر 1". */
export const productOptionGroups = mysqlTable(
  'product_option_groups',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    productId: int('product_id', { unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 120 }).notNull(),
    required: boolean('required').notNull().default(false),
    maxChoices: smallint('max_choices', { unsigned: true }).notNull().default(1),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => [index('product_option_groups_product_idx').on(t.productId, t.sortOrder)],
);

/** A row in an option group: "ربع كيلو (+58.75 ج.م)". */
export const productOptions = mysqlTable(
  'product_options',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    groupId: int('group_id', { unsigned: true })
      .notNull()
      .references(() => productOptionGroups.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    priceDelta: money('price_delta').notNull().default(0),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => [index('product_options_group_idx').on(t.groupId, t.sortOrder)],
);

/** A base ingredient (§8.5 "المكونات الاساسية") the customer may strike out. */
export const productIngredients = mysqlTable(
  'product_ingredients',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    productId: int('product_id', { unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => [index('product_ingredients_product_idx').on(t.productId, t.sortOrder)],
);

/** Home tiles (§8.2): order and images set by the admin [Client]. A tile opens a vertical or one store. */
export const homeTiles = mysqlTable('home_tiles', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  label: varchar('label', { length: 120 }).notNull(),
  image: varchar('image', { length: 255 }),
  badge: varchar('badge', { length: 30 }),
  row: mysqlEnum('tile_row', HOME_TILE_ROWS).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  targetVertical: mysqlEnum('target_vertical', VERTICALS),
  targetStoreId: int('target_store_id', { unsigned: true }).references(() => stores.id, { onDelete: 'cascade' }),
});

export type StoreRow = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type CategoryRow = typeof storeCategories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type CuisineRow = typeof cuisines.$inferSelect;
export type OptionGroupRow = typeof productOptionGroups.$inferSelect;
export type OptionRow = typeof productOptions.$inferSelect;
export type IngredientRow = typeof productIngredients.$inferSelect;
export type HomeTileRow = typeof homeTiles.$inferSelect;

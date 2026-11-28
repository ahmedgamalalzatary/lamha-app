import { Injectable } from '@nestjs/common';
import type { Ingredient, OptionGroup, Product, ProductOptionsInput, SearchScope, Vertical } from '@tawsela/shared';
import { and, asc, count, desc, eq, gte, inArray, isNull, like, max, min, ne, or, sql, type SQL } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { zones } from '../addresses/addresses.schema.js';
import { carts } from '../cart/cart.schema.js';
import { type NewUser, users } from '../users/users.schema.js';
import {
  cuisines,
  homeSections,
  homeSectionStores,
  searchLogs,
  type HomeSectionRow,
  homeTiles,
  type HomeTileRow,
  type NewStore,
  productIngredients,
  productOptionGroups,
  productOptions,
  products,
  type ProductRow,
  storeCategories,
  storeCuisines,
  type StoreRow,
  stores,
} from './catalog.schema.js';
import { toProduct } from './store-view.js';

type Sortable = typeof storeCategories | typeof cuisines | typeof homeTiles | typeof homeSections;
/** A transaction's handle; repository methods that take one run inside it. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Most products one search returns. */
const SEARCH_LIMIT = 200;

/** LIKE pattern for "contains": % and _ in the text are matched as themselves. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * The stores that deliver to a chosen address's zone (§8.9), while that zone is switched on: an
 * address in a switched-off zone lists nothing (review F17). No zone given: no limit.
 */
const inActiveZone = (zoneId: number | undefined): SQL | undefined =>
  zoneId === undefined ? undefined : and(eq(stores.zoneId, zoneId), sql`EXISTS (SELECT 1 FROM ${zones} WHERE ${zones.id} = ${zoneId} AND ${zones.active} = true)`);

/** مطاعم are restaurants, متاجر أخرى everything else (shared `inSearchScope`). */
const scopeWhere = (scope: SearchScope): SQL | undefined =>
  scope === 'restaurants' ? eq(stores.vertical, 'restaurant') : scope === 'others' ? ne(stores.vertical, 'restaurant') : undefined;

/** Database access for stores, categories, products, cuisines and home tiles. */
@Injectable()
export class CatalogRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  // Stores

  async listStores(
    filter: { vertical?: Vertical; cuisineId?: number; activeOnly?: boolean; q?: string; ids?: number[]; zoneId?: number } = {},
  ): Promise<StoreRow[]> {
    const where: SQL[] = [];
    if (filter.zoneId !== undefined) where.push(inActiveZone(filter.zoneId)!);
    if (filter.ids) {
      if (!filter.ids.length) return [];
      where.push(inArray(stores.id, filter.ids));
    }
    if (filter.vertical) where.push(eq(stores.vertical, filter.vertical));
    if (filter.q) where.push(like(stores.name, contains(filter.q)));
    if (filter.activeOnly) where.push(eq(stores.active, true));
    if (filter.cuisineId !== undefined) {
      const linked = this.db.select({ id: storeCuisines.storeId }).from(storeCuisines).where(eq(storeCuisines.cuisineId, filter.cuisineId));
      where.push(inArray(stores.id, linked));
    }
    return this.db.select().from(stores).where(and(...where)).orderBy(asc(stores.id));
  }

  async findStore(id: number): Promise<StoreRow | undefined> {
    const [row] = await this.db.select().from(stores).where(eq(stores.id, id));
    return row;
  }

  /** Cuisine ids per store, for these stores. */
  async cuisineIdsOf(storeIds: number[]): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>(storeIds.map((id) => [id, []]));
    if (!storeIds.length) return map;
    const rows = await this.db
      .select()
      .from(storeCuisines)
      .where(inArray(storeCuisines.storeId, storeIds))
      .orderBy(asc(storeCuisines.cuisineId));
    for (const r of rows) map.get(r.storeId)?.push(r.cuisineId);
    return map;
  }

  async productCountsOf(storeIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>(storeIds.map((id) => [id, 0]));
    if (!storeIds.length) return map;
    const rows = await this.db
      .select({ storeId: products.storeId, n: count() })
      .from(products)
      .where(inArray(products.storeId, storeIds))
      .groupBy(products.storeId);
    for (const r of rows) map.set(r.storeId, r.n);
    return map;
  }

  /** The store and its first partner account together: both or neither (contract §2). */
  async createStoreWithPartner(store: NewStore, cuisineIds: number[], partner: NewUser): Promise<{ storeId: number; partnerId: number }> {
    return this.db.transaction(async (tx) => {
      const [s] = await tx.insert(stores).values(store).$returningId();
      const storeId = s!.id;
      if (cuisineIds.length) await tx.insert(storeCuisines).values(cuisineIds.map((cuisineId) => ({ storeId, cuisineId })));
      const [u] = await tx
        .insert(users)
        .values({ ...partner, storeId })
        .$returningId();
      return { storeId, partnerId: u!.id };
    });
  }

  async updateStore(id: number, values: Partial<NewStore>, cuisineIds?: number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // An older cart may still have pickup stored while the store is disabled.
      const [previous] = values.pickupAllowed === true
        ? await tx.select({ pickupAllowed: stores.pickupAllowed }).from(stores).where(eq(stores.id, id)).for('update')
        : [];
      if (Object.keys(values).length) await tx.update(stores).set(values).where(eq(stores.id, id));
      if (values.pickupAllowed === false || previous?.pickupAllowed === false) {
        await tx.update(carts).set({ mode: 'delivery' }).where(and(eq(carts.storeId, id), eq(carts.mode, 'pickup')));
      }
      if (cuisineIds) {
        await tx.delete(storeCuisines).where(eq(storeCuisines.storeId, id));
        if (cuisineIds.length) await tx.insert(storeCuisines).values(cuisineIds.map((cuisineId) => ({ storeId: id, cuisineId })));
      }
    });
  }

  // Categories

  async listCategories(storeId: number) {
    return this.db
      .select()
      .from(storeCategories)
      .where(eq(storeCategories.storeId, storeId))
      .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.id));
  }

  /**
   * Runs one change to a store's categories while holding its store row: the checks inside (one
   * level deep, empty before delete) then see no other change of that store half done.
   */
  async withStoreLocked<T>(storeId: number, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).for('update');
      return fn(tx);
    });
  }

  async findCategory(id: number, db: Db | Tx = this.db) {
    const [row] = await db.select().from(storeCategories).where(eq(storeCategories.id, id));
    return row;
  }

  /** Products per category of a store; `activeOnly` counts what customers see. */
  async categoryCounts(storeId: number, activeOnly = false, db: Db | Tx = this.db): Promise<Map<number, number>> {
    const where = activeOnly ? and(eq(products.storeId, storeId), eq(products.active, true)) : eq(products.storeId, storeId);
    const rows = await db.select({ categoryId: products.categoryId, n: count() }).from(products).where(where).groupBy(products.categoryId);
    return new Map(rows.map((r) => [r.categoryId, r.n]));
  }

  async createCategory(
    storeId: number,
    values: { name: string; image?: string | null; parentId?: number | null },
    db: Db | Tx = this.db,
  ): Promise<number> {
    const sortOrder = await this.nextSortOrder(storeCategories, eq(storeCategories.storeId, storeId), db);
    const [row] = await db
      .insert(storeCategories)
      .values({ storeId, name: values.name, image: values.image ?? null, parentId: values.parentId ?? null, sortOrder })
      .$returningId();
    return row!.id;
  }

  async updateCategory(id: number, values: { name?: string; image?: string | null; parentId?: number | null }, db: Db | Tx = this.db): Promise<void> {
    if (Object.keys(values).length) await db.update(storeCategories).set(values).where(eq(storeCategories.id, id));
  }

  async countSubcategories(id: number, db: Db | Tx = this.db): Promise<number> {
    const [row] = await db.select({ n: count() }).from(storeCategories).where(eq(storeCategories.parentId, id));
    return row?.n ?? 0;
  }

  async deleteCategory(id: number, db: Db | Tx = this.db): Promise<void> {
    await db.delete(storeCategories).where(eq(storeCategories.id, id));
  }

  // Products

  /** In menu order: by category, then by place inside the category. */
  async listProducts(storeId: number, activeOnly = false): Promise<ProductRow[]> {
    const where = activeOnly ? and(eq(products.storeId, storeId), eq(products.active, true)) : eq(products.storeId, storeId);
    const rows = await this.db
      .select({ product: products })
      .from(products)
      .innerJoin(storeCategories, eq(storeCategories.id, products.categoryId))
      .where(where)
      .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.id), asc(products.sortOrder), asc(products.id));
    return rows.map((r) => r.product);
  }

  /** Search (§8.13): products customers may see whose name contains the text, in active stores (of the zone, before the limit: review F31). */
  async searchProducts(q: string, scope: SearchScope, zoneId?: number): Promise<ProductRow[]> {
    const rows = await this.db
      .select({ product: products })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .innerJoin(storeCategories, eq(storeCategories.id, products.categoryId))
      .where(and(eq(products.active, true), eq(stores.active, true), like(products.name, contains(q)), scopeWhere(scope), inActiveZone(zoneId)))
      .orderBy(asc(products.storeId), asc(storeCategories.sortOrder), asc(products.sortOrder), asc(products.id))
      .limit(SEARCH_LIMIT);
    return rows.map((r) => r.product);
  }

  /** Every store with a product customers may see that matches: not cut by the product list's limit. */
  async storeIdsWithProduct(q: string, scope: SearchScope, zoneId?: number): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ storeId: products.storeId })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(eq(products.active, true), eq(stores.active, true), like(products.name, contains(q)), scopeWhere(scope), inActiveZone(zoneId)));
    return rows.map((r) => r.storeId);
  }

  /** Suggestions while typing (§8.13): distinct product names with their store's type. */
  async suggestProducts(q: string, scope: SearchScope, limit: number, zoneId?: number): Promise<{ name: string; vertical: Vertical }[]> {
    return this.db
      .select({ name: products.name, vertical: stores.vertical })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(eq(products.active, true), eq(stores.active, true), like(products.name, contains(q)), scopeWhere(scope), inActiveZone(zoneId)))
      .groupBy(products.name, stores.vertical)
      .orderBy(min(products.id))
      .limit(limit);
  }

  async findProduct(id: number): Promise<ProductRow | undefined> {
    const [row] = await this.db.select().from(products).where(eq(products.id, id));
    return row;
  }

  /** منتجات غير فعالة: every store's switched-off products, with the store and category names. */
  async listInactiveProducts() {
    return this.db
      .select({ product: products, storeName: stores.name, categoryName: storeCategories.name })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .innerJoin(storeCategories, eq(storeCategories.id, products.categoryId))
      .where(eq(products.active, false))
      .orderBy(asc(stores.name), asc(products.name));
  }

  /** The product with its choices, together: all or nothing. */
  async createProduct(values: typeof products.$inferInsert, choices: Partial<ProductOptionsInput> = {}): Promise<number> {
    const sortOrder = await this.nextSortOrder(products, eq(products.categoryId, values.categoryId));
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({ ...values, sortOrder })
        .$returningId();
      await this.replaceChoices(tx, row!.id, choices);
      return row!.id;
    });
  }

  /** Given option groups or ingredients replace the old ones; left out, they stay. */
  async updateProduct(id: number, values: Partial<typeof products.$inferInsert>, choices: Partial<ProductOptionsInput> = {}): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (Object.keys(values).length) await tx.update(products).set(values).where(eq(products.id, id));
      await this.replaceChoices(tx, id, choices);
    });
  }

  private async replaceChoices(tx: Tx, productId: number, choices: Partial<ProductOptionsInput>): Promise<void> {
    if (choices.optionGroups) {
      // Deleting a group deletes its options (cascade).
      await tx.delete(productOptionGroups).where(eq(productOptionGroups.productId, productId));
      for (const [gi, g] of choices.optionGroups.entries()) {
        const [group] = await tx
          .insert(productOptionGroups)
          .values({ productId, title: g.title, required: g.required, maxChoices: g.maxChoices, sortOrder: gi })
          .$returningId();
        await tx.insert(productOptions).values(g.options.map((o, oi) => ({ groupId: group!.id, name: o.name, priceDelta: o.priceDelta, sortOrder: oi })));
      }
    }
    if (choices.ingredients) {
      await tx.delete(productIngredients).where(eq(productIngredients.productId, productId));
      if (choices.ingredients.length) {
        await tx.insert(productIngredients).values(choices.ingredients.map((name, i) => ({ productId, name, sortOrder: i })));
      }
    }
  }

  /** Products as the API sends them: each with its choices. */
  async withChoices(rows: ProductRow[]): Promise<Product[]> {
    const choices = await this.choicesOf(rows.map((r) => r.id));
    return rows.map((r) => toProduct(r, choices.get(r.id)));
  }

  /** Each product's option groups (with their options) and ingredients, in order. */
  async choicesOf(productIds: number[], db: Db | Tx = this.db): Promise<Map<number, { optionGroups: OptionGroup[]; ingredients: Ingredient[] }>> {
    const map = new Map(productIds.map((id) => [id, { optionGroups: [] as OptionGroup[], ingredients: [] as Ingredient[] }]));
    if (!productIds.length) return map;
    const [groups, ingredients] = await Promise.all([
      db
        .select()
        .from(productOptionGroups)
        .where(inArray(productOptionGroups.productId, productIds))
        .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id)),
      db
        .select()
        .from(productIngredients)
        .where(inArray(productIngredients.productId, productIds))
        .orderBy(asc(productIngredients.sortOrder), asc(productIngredients.id)),
    ]);
    const options = groups.length
      ? await db
          .select()
          .from(productOptions)
          .where(
            inArray(
              productOptions.groupId,
              groups.map((g) => g.id),
            ),
          )
          .orderBy(asc(productOptions.sortOrder), asc(productOptions.id))
      : [];
    for (const g of groups) {
      map.get(g.productId)?.optionGroups.push({
        id: g.id,
        title: g.title,
        required: g.required,
        maxChoices: g.maxChoices,
        options: options.filter((o) => o.groupId === g.id).map((o) => ({ id: o.id, name: o.name, priceDelta: o.priceDelta })),
      });
    }
    for (const i of ingredients) map.get(i.productId)?.ingredients.push({ id: i.id, name: i.name });
    return map;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  // Cuisines

  async listCuisines() {
    return this.db.select().from(cuisines).orderBy(asc(cuisines.sortOrder), asc(cuisines.id));
  }

  async findCuisine(id: number) {
    const [row] = await this.db.select().from(cuisines).where(eq(cuisines.id, id));
    return row;
  }

  async countCuisines(ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const [row] = await this.db.select({ n: count() }).from(cuisines).where(inArray(cuisines.id, ids));
    return row?.n ?? 0;
  }

  async createCuisine(values: { name: string; image?: string | null }): Promise<number> {
    const sortOrder = await this.nextSortOrder(cuisines);
    const [row] = await this.db
      .insert(cuisines)
      .values({ name: values.name, image: values.image ?? null, sortOrder })
      .$returningId();
    return row!.id;
  }

  async updateCuisine(id: number, values: { name?: string; image?: string | null }): Promise<void> {
    if (Object.keys(values).length) await this.db.update(cuisines).set(values).where(eq(cuisines.id, id));
  }

  /** Stores lose the link with it (the join rows cascade). */
  async deleteCuisine(id: number): Promise<void> {
    await this.db.delete(cuisines).where(eq(cuisines.id, id));
  }

  // Home tiles

  async listHomeTiles(): Promise<HomeTileRow[]> {
    return this.db.select().from(homeTiles).orderBy(asc(homeTiles.row), asc(homeTiles.sortOrder), asc(homeTiles.id));
  }

  /** Tiles customers see: a tile pinned to a hidden store is left out. */
  async listVisibleHomeTiles(): Promise<HomeTileRow[]> {
    const rows = await this.db
      .select({ tile: homeTiles })
      .from(homeTiles)
      .leftJoin(stores, eq(stores.id, homeTiles.targetStoreId))
      .where(or(isNull(homeTiles.targetStoreId), eq(stores.active, true)))
      .orderBy(asc(homeTiles.row), asc(homeTiles.sortOrder), asc(homeTiles.id));
    return rows.map((r) => r.tile);
  }

  async findHomeTile(id: number): Promise<HomeTileRow | undefined> {
    const [row] = await this.db.select().from(homeTiles).where(eq(homeTiles.id, id));
    return row;
  }

  async createHomeTile(values: Omit<typeof homeTiles.$inferInsert, 'sortOrder'>): Promise<number> {
    const sortOrder = await this.nextSortOrder(homeTiles, eq(homeTiles.row, values.row));
    const [row] = await this.db
      .insert(homeTiles)
      .values({ ...values, sortOrder })
      .$returningId();
    return row!.id;
  }

  async updateHomeTile(id: number, values: Partial<typeof homeTiles.$inferInsert>): Promise<void> {
    if (Object.keys(values).length) await this.db.update(homeTiles).set(values).where(eq(homeTiles.id, id));
  }

  async deleteHomeTile(id: number): Promise<void> {
    await this.db.delete(homeTiles).where(eq(homeTiles.id, id));
  }

  // Home sections

  async listHomeSections(): Promise<HomeSectionRow[]> {
    return this.db.select().from(homeSections).orderBy(asc(homeSections.sortOrder), asc(homeSections.id));
  }

  async findHomeSection(id: number): Promise<HomeSectionRow | undefined> {
    const [row] = await this.db.select().from(homeSections).where(eq(homeSections.id, id));
    return row;
  }

  /** Each section's store ids, in order. */
  async homeSectionStoreIds(sectionIds: number[]): Promise<Map<number, number[]>> {
    const out = new Map<number, number[]>(sectionIds.map((id) => [id, []]));
    if (!sectionIds.length) return out;
    const rows = await this.db
      .select()
      .from(homeSectionStores)
      .where(inArray(homeSectionStores.sectionId, sectionIds))
      .orderBy(asc(homeSectionStores.sortOrder));
    for (const r of rows) out.get(r.sectionId)?.push(r.storeId);
    return out;
  }

  async createHomeSection(values: Omit<typeof homeSections.$inferInsert, 'sortOrder'>, storeIds: number[]): Promise<number> {
    return this.db.transaction(async (tx) => {
      const sortOrder = await this.nextSortOrder(homeSections, undefined, tx);
      const [row] = await tx
        .insert(homeSections)
        .values({ ...values, sortOrder })
        .$returningId();
      await this.writeSectionStores(tx, row!.id, storeIds);
      return row!.id;
    });
  }

  /** `storeIds` replaces the section's stores when given. */
  async updateHomeSection(id: number, values: Partial<typeof homeSections.$inferInsert>, storeIds?: number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (Object.keys(values).length) await tx.update(homeSections).set(values).where(eq(homeSections.id, id));
      if (storeIds) {
        await tx.delete(homeSectionStores).where(eq(homeSectionStores.sectionId, id));
        await this.writeSectionStores(tx, id, storeIds);
      }
    });
  }

  async deleteHomeSection(id: number): Promise<void> {
    await this.db.delete(homeSections).where(eq(homeSections.id, id));
  }

  private async writeSectionStores(tx: Tx, sectionId: number, storeIds: number[]): Promise<void> {
    if (storeIds.length) await tx.insert(homeSectionStores).values(storeIds.map((storeId, sortOrder) => ({ sectionId, storeId, sortOrder })));
  }

  // Search words (L1 #4)

  async logSearch(term: string): Promise<void> {
    await this.db.insert(searchLogs).values({ term });
  }

  /** The most searched words since `since`, most first. */
  async topSearches(since: Date, limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ term: searchLogs.term, n: count() })
      .from(searchLogs)
      .where(gte(searchLogs.createdAt, since))
      .groupBy(searchLogs.term)
      .orderBy(desc(count()), asc(searchLogs.term))
      .limit(limit);
    return rows.map((r) => r.term);
  }

  // Order

  /** Sets sort_order to each id's place in the list. */
  async setOrder(table: Sortable, ids: number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(table).set({ sortOrder: i }).where(eq(table.id, id));
    });
  }

  /** One past the highest sort_order in the scope, so a new row goes at the end. */
  private async nextSortOrder(table: Sortable | typeof products, where?: SQL, db: Db | Tx = this.db): Promise<number> {
    const [row] = await db
      .select({ top: max(table.sortOrder) })
      .from(table as MySqlTable)
      .where(where);
    return row?.top === null || row?.top === undefined ? 0 : row.top + 1;
  }
}

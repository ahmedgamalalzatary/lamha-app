import { Injectable } from '@nestjs/common';
import type { Ingredient, OptionGroup, Product, ProductOptionsInput, SearchScope, Vertical } from '@tawsela/shared';
import { and, asc, count, eq, inArray, isNull, like, max, min, ne, or, type SQL } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { type NewUser, users } from '../users/users.schema.js';
import {
  cuisines,
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

type Sortable = typeof storeCategories | typeof cuisines | typeof homeTiles;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Most products one search returns. */
const SEARCH_LIMIT = 200;

/** LIKE pattern for "contains": % and _ in the text are matched as themselves. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/** مطاعم are restaurants, متاجر أخرى everything else (shared `inSearchScope`). */
const scopeWhere = (scope: SearchScope): SQL | undefined =>
  scope === 'restaurants' ? eq(stores.vertical, 'restaurant') : scope === 'others' ? ne(stores.vertical, 'restaurant') : undefined;

/** Database access for stores, categories, products, cuisines and home tiles. */
@Injectable()
export class CatalogRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  // Stores

  async listStores(filter: { vertical?: Vertical; cuisineId?: number; activeOnly?: boolean; q?: string; ids?: number[] } = {}): Promise<StoreRow[]> {
    const where: SQL[] = [];
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
      if (Object.keys(values).length) await tx.update(stores).set(values).where(eq(stores.id, id));
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

  async findCategory(id: number) {
    const [row] = await this.db.select().from(storeCategories).where(eq(storeCategories.id, id));
    return row;
  }

  /** Products per category of a store; `activeOnly` counts what customers see. */
  async categoryCounts(storeId: number, activeOnly = false): Promise<Map<number, number>> {
    const where = activeOnly ? and(eq(products.storeId, storeId), eq(products.active, true)) : eq(products.storeId, storeId);
    const rows = await this.db.select({ categoryId: products.categoryId, n: count() }).from(products).where(where).groupBy(products.categoryId);
    return new Map(rows.map((r) => [r.categoryId, r.n]));
  }

  async createCategory(storeId: number, values: { name: string; image?: string | null; parentId?: number | null }): Promise<number> {
    const sortOrder = await this.nextSortOrder(storeCategories, eq(storeCategories.storeId, storeId));
    const [row] = await this.db
      .insert(storeCategories)
      .values({ storeId, name: values.name, image: values.image ?? null, parentId: values.parentId ?? null, sortOrder })
      .$returningId();
    return row!.id;
  }

  async updateCategory(id: number, values: { name?: string; image?: string | null; parentId?: number | null }): Promise<void> {
    if (Object.keys(values).length) await this.db.update(storeCategories).set(values).where(eq(storeCategories.id, id));
  }

  async countSubcategories(id: number): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(storeCategories).where(eq(storeCategories.parentId, id));
    return row?.n ?? 0;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.db.delete(storeCategories).where(eq(storeCategories.id, id));
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

  /** Search (§8.13): products customers may see whose name contains the text, in active stores. */
  async searchProducts(q: string, scope: SearchScope): Promise<ProductRow[]> {
    const rows = await this.db
      .select({ product: products })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .innerJoin(storeCategories, eq(storeCategories.id, products.categoryId))
      .where(and(eq(products.active, true), eq(stores.active, true), like(products.name, contains(q)), scopeWhere(scope)))
      .orderBy(asc(products.storeId), asc(storeCategories.sortOrder), asc(products.sortOrder), asc(products.id))
      .limit(SEARCH_LIMIT);
    return rows.map((r) => r.product);
  }

  /** Suggestions while typing (§8.13): distinct product names with their store's type. */
  async suggestProducts(q: string, scope: SearchScope, limit: number): Promise<{ name: string; vertical: Vertical }[]> {
    return this.db
      .select({ name: products.name, vertical: stores.vertical })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(eq(products.active, true), eq(stores.active, true), like(products.name, contains(q)), scopeWhere(scope)))
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
  async choicesOf(productIds: number[]): Promise<Map<number, { optionGroups: OptionGroup[]; ingredients: Ingredient[] }>> {
    const map = new Map(productIds.map((id) => [id, { optionGroups: [] as OptionGroup[], ingredients: [] as Ingredient[] }]));
    if (!productIds.length) return map;
    const [groups, ingredients] = await Promise.all([
      this.db
        .select()
        .from(productOptionGroups)
        .where(inArray(productOptionGroups.productId, productIds))
        .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id)),
      this.db
        .select()
        .from(productIngredients)
        .where(inArray(productIngredients.productId, productIds))
        .orderBy(asc(productIngredients.sortOrder), asc(productIngredients.id)),
    ]);
    const options = groups.length
      ? await this.db
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

  // Order

  /** Sets sort_order to each id's place in the list. */
  async setOrder(table: Sortable, ids: number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(table).set({ sortOrder: i }).where(eq(table.id, id));
    });
  }

  /** One past the highest sort_order in the scope, so a new row goes at the end. */
  private async nextSortOrder(table: Sortable | typeof products, where?: SQL): Promise<number> {
    const [row] = await this.db
      .select({ top: max(table.sortOrder) })
      .from(table as MySqlTable)
      .where(where);
    return row?.top === null || row?.top === undefined ? 0 : row.top + 1;
  }
}

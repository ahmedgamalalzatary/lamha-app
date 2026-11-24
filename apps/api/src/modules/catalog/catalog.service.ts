import { HttpStatus, Injectable } from '@nestjs/common';
import {
  applyStoreFilter,
  type CatalogStore,
  type Cuisine,
  type HomeScreen,
  INVITE_REWARDS,
  inSearchScope,
  type SearchResult,
  type SearchScope,
  type SearchSuggestion,
  type StoreFilter,
  type StorePage,
  type Vertical,
} from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { CatalogRepository } from './catalog.repository.js';
import type { StoreRow } from './catalog.schema.js';

/** Suggestions shown while typing. */
const SUGGESTIONS = 8;
import { toCatalogStore, toCategory, toCuisine, toHomeTile, toProduct } from './store-view.js';

/**
 * What the apps read (contract §8.2–§8.4): active stores, their categories and the products
 * customers may see. Phases 5–7 add the home sections, filters, sort and search on top.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly catalog: CatalogRepository) {}

  /** A store list (§8.3): its type, cuisine and search box, then the sort sheet, rating sheet and chips. */
  async stores(query: { vertical?: Vertical; cuisineId?: number; q?: string } & StoreFilter): Promise<CatalogStore[]> {
    const { sort, minRating, fast, pickup, ...where } = query;
    return applyStoreFilter(await this.toStores(await this.catalog.listStores({ ...where, activeOnly: true })), { sort, minRating, fast, pickup });
  }

  /** Search (§8.13): stores whose name matches, and stores with matching products, each with those products. */
  async search(q: string, scope: SearchScope): Promise<SearchResult[]> {
    const [byName, products] = await Promise.all([this.catalog.listStores({ q, activeOnly: true }), this.catalog.searchProducts(q, scope)]);
    const ids = new Set([...byName.map((s) => s.id), ...products.map((p) => p.storeId)]);
    const stores = (await this.toStores(await this.catalog.listStores({ ids: [...ids], activeOnly: true }))).filter((s) =>
      inSearchScope(s.vertical, scope),
    );
    return stores.map((store) => ({ store, products: products.filter((p) => p.storeId === store.id).map(toProduct) }));
  }

  suggestions(q: string, scope: SearchScope): Promise<SearchSuggestion[]> {
    return this.catalog.suggestProducts(q, scope, SUGGESTIONS);
  }

  private async toStores(rows: StoreRow[]): Promise<CatalogStore[]> {
    const cuisineIds = await this.catalog.cuisineIdsOf(rows.map((r) => r.id));
    const now = new Date();
    return rows.map((row) => toCatalogStore(row, cuisineIds.get(row.id) ?? [], now));
  }

  /** A store page: categories in order, each with its active products; empty categories are left out. */
  async store(id: number): Promise<StorePage> {
    const row = await this.catalog.findStore(id);
    if (!row?.active) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    const [cuisineIds, categories, products] = await Promise.all([
      this.catalog.cuisineIdsOf([id]),
      this.catalog.listCategories(id),
      this.catalog.listProducts(id, true),
    ]);
    return {
      ...toCatalogStore(row, cuisineIds.get(id) ?? [], new Date()),
      categories: categories
        .map((c) => {
          const items = products.filter((p) => p.categoryId === c.id).map(toProduct);
          return { ...toCategory(c, items.length), products: items };
        })
        .filter((c) => c.products.length > 0),
    };
  }

  /** The customer home (§8.2): the tiles customers may open and the invite card's rewards. */
  async home(): Promise<HomeScreen> {
    const tiles = (await this.catalog.listVisibleHomeTiles()).map(toHomeTile);
    return { tiles, invite: INVITE_REWARDS };
  }

  async cuisines(): Promise<Cuisine[]> {
    return (await this.catalog.listCuisines()).map(toCuisine);
  }
}

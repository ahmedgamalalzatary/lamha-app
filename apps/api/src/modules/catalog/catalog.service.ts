import { HttpStatus, Injectable } from '@nestjs/common';
import {
  applyStoreFilter,
  type CatalogStore,
  type Cuisine,
  type HomeScreen,
  INVITE_REWARDS,
  inSearchScope,
  type LatLng,
  type SearchResult,
  type SearchScope,
  type SearchSuggestion,
  type StoreFilter,
  type StorePage,
  type Vertical,
} from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { AddressesService } from '../addresses/addresses.service.js';
import { CatalogRepository } from './catalog.repository.js';
import type { StoreRow } from './catalog.schema.js';
import { toCatalogStore, toCategory, toCuisine, toHomeTile } from './store-view.js';

/** Suggestions shown while typing. */
const SUGGESTIONS = 8;

/**
 * What the apps read (contract §8.2–§8.4): active stores, their categories and the products
 * customers may see. Phases 5–7 add the home sections, filters, sort and search on top.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly addresses: AddressesService,
  ) {}

  /** The chosen address's zone and spot; none chosen lists every store (§8.9). */
  private async deliverTo(userId: number, addressId?: number): Promise<{ zoneId?: number; from?: LatLng }> {
    if (addressId === undefined) return {};
    const address = await this.addresses.findOf(userId, addressId);
    return { zoneId: address.zoneId, from: { lat: address.lat, lng: address.lng } };
  }

  /** A store list (§8.3): its type, cuisine and search box, then the sort sheet, rating sheet and chips. */
  async stores(userId: number, query: { vertical?: Vertical; cuisineId?: number; q?: string; addressId?: number } & StoreFilter): Promise<CatalogStore[]> {
    const { sort, minRating, fast, pickup, addressId, ...where } = query;
    const { zoneId, from } = await this.deliverTo(userId, addressId);
    const rows = await this.catalog.listStores({ ...where, zoneId, activeOnly: true });
    return applyStoreFilter(await this.toStores(rows), { sort, minRating, fast, pickup }, from);
  }

  /** Search (§8.13): stores whose name matches, and stores with matching products, each with those products. */
  async search(userId: number, q: string, scope: SearchScope, addressId?: number): Promise<SearchResult[]> {
    const { zoneId } = await this.deliverTo(userId, addressId);
    const [byName, byProduct, rows] = await Promise.all([
      this.catalog.listStores({ q, activeOnly: true }),
      this.catalog.storeIdsWithProduct(q, scope),
      this.catalog.searchProducts(q, scope),
    ]);
    const products = await this.catalog.withChoices(rows);
    const ids = new Set([...byName.map((s) => s.id), ...byProduct]);
    const stores = (await this.toStores(await this.catalog.listStores({ ids: [...ids], zoneId, activeOnly: true }))).filter((s) =>
      inSearchScope(s.vertical, scope),
    );
    return stores.map((store) => ({ store, products: products.filter((p) => p.storeId === store.id) }));
  }

  suggestions(q: string, scope: SearchScope): Promise<SearchSuggestion[]> {
    return this.catalog.suggestProducts(q, scope, SUGGESTIONS);
  }

  /** These stores as the apps list them, in the given order; hidden ones are left out. */
  async storesByIds(ids: number[]): Promise<CatalogStore[]> {
    const stores = await this.toStores(await this.catalog.listStores({ ids, activeOnly: true }));
    const byId = new Map(stores.map((s) => [s.id, s]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /** Whether customers can see this store. */
  async isVisible(id: number): Promise<boolean> {
    return (await this.catalog.findStore(id))?.active === true;
  }

  private async toStores(rows: StoreRow[]): Promise<CatalogStore[]> {
    const cuisineIds = await this.catalog.cuisineIdsOf(rows.map((r) => r.id));
    const now = new Date();
    return rows.map((row) => toCatalogStore(row, cuisineIds.get(row.id) ?? [], now));
  }

  /**
   * A store page: categories in order, each with its products (switched-off ones marked) and choices. Empty categories
   * are left out; a main category stays while one of its sub-categories has products.
   */
  async store(id: number): Promise<StorePage> {
    const row = await this.catalog.findStore(id);
    if (!row?.active) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    const [cuisineIds, categories, rows] = await Promise.all([
      this.catalog.cuisineIdsOf([id]),
      this.catalog.listCategories(id),
      // Switched-off products come too: the app greys them with "غير متوفر", as Tawsilty does.
      this.catalog.listProducts(id),
    ]);
    const products = await this.catalog.withChoices(rows);
    const all = categories.map((c) => {
      const items = products.filter((p) => p.categoryId === c.id);
      return { ...toCategory(c, items.length), products: items };
    });
    const filled = new Set(all.filter((c) => c.products.length).flatMap((c) => (c.parentId ? [c.id, c.parentId] : [c.id])));
    return { ...toCatalogStore(row, cuisineIds.get(id) ?? [], new Date()), categories: all.filter((c) => filled.has(c.id)) };
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

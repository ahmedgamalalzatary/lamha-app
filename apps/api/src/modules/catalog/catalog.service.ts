import { HttpStatus, Injectable } from '@nestjs/common';
import {
  applyStoreFilter,
  type CatalogStore,
  type Cuisine,
  type HomeScreen,
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
import { SettingsService } from '../settings/settings.service.js';
import { InvitesService } from '../invites/invites.service.js';
import { feeFrom, toCatalogStore, toCategory, toCuisine, toHomeTile } from './store-view.js';

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
    private readonly settings: SettingsService,
    private readonly invites: InvitesService,
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
    return applyStoreFilter(await this.toStores(rows, from), { sort, minRating, fast, pickup }, from);
  }

  /** Search (§8.13): stores whose name matches, and stores with matching products, each with those products. */
  async search(userId: number, q: string, scope: SearchScope, addressId?: number): Promise<SearchResult[]> {
    const { zoneId, from } = await this.deliverTo(userId, addressId);
    // The zone limits every query before its own limit (review F31).
    const [byName, byProduct, rows] = await Promise.all([
      this.catalog.listStores({ q, zoneId, activeOnly: true }),
      this.catalog.storeIdsWithProduct(q, scope, zoneId),
      this.catalog.searchProducts(q, scope, zoneId),
    ]);
    const products = await this.catalog.withChoices(rows);
    const ids = new Set([...byName.map((s) => s.id), ...byProduct]);
    const stores = (await this.toStores(await this.catalog.listStores({ ids: [...ids], zoneId, activeOnly: true }), from)).filter((s) =>
      inSearchScope(s.vertical, scope),
    );
    return stores.map((store) => ({ store, products: products.filter((p) => p.storeId === store.id) }));
  }

  /** Product names while typing, from the stores that deliver to the chosen address (review F32). */
  async suggestions(userId: number, q: string, scope: SearchScope, addressId?: number): Promise<SearchSuggestion[]> {
    const { zoneId } = await this.deliverTo(userId, addressId);
    return this.catalog.suggestProducts(q, scope, SUGGESTIONS, zoneId);
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

  /** With `from` (the chosen address's spot), each store's delivery fee to it (§8.7). */
  private async toStores(rows: StoreRow[], from?: LatLng): Promise<CatalogStore[]> {
    const [cuisineIds, rule] = await Promise.all([this.catalog.cuisineIdsOf(rows.map((r) => r.id)), this.settings.delivery()]);
    const now = new Date();
    return rows.map((row) => toCatalogStore(row, cuisineIds.get(row.id) ?? [], now, feeFrom(row, from, rule)));
  }

  /**
   * A store page: categories in order, each with its products (switched-off ones marked) and choices. Empty categories
   * are left out; a main category stays while one of its sub-categories has products. With `addressId`, the fee is
   * the one to that address.
   */
  async store(id: number, userId?: number, addressId?: number): Promise<StorePage> {
    const row = await this.catalog.findStore(id);
    if (!row?.active) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    const { from } = userId === undefined ? {} : await this.deliverTo(userId, addressId);
    const [cuisineIds, categories, rows, rule] = await Promise.all([
      this.catalog.cuisineIdsOf([id]),
      this.catalog.listCategories(id),
      // Switched-off products come too: the app greys them with "غير متوفر", as Tawsilty does.
      this.catalog.listProducts(id),
      this.settings.delivery(),
    ]);
    const products = await this.catalog.withChoices(rows);
    const all = categories.map((c) => {
      const items = products.filter((p) => p.categoryId === c.id);
      return { ...toCategory(c, items.length), products: items };
    });
    const filled = new Set(all.filter((c) => c.products.length).flatMap((c) => (c.parentId ? [c.id, c.parentId] : [c.id])));
    return { ...toCatalogStore(row, cuisineIds.get(id) ?? [], new Date(), feeFrom(row, from, rule)), categories: all.filter((c) => filled.has(c.id)) };
  }

  /** The customer home (§8.2): the tiles customers may open and the invite card's rewards. */
  async home(): Promise<HomeScreen> {
    const tiles = (await this.catalog.listVisibleHomeTiles()).map(toHomeTile);
    return { tiles, invite: await this.invites.rewards() };
  }

  async cuisines(): Promise<Cuisine[]> {
    return (await this.catalog.listCuisines()).map(toCuisine);
  }
}

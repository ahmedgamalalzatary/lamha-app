import { HttpStatus, Injectable } from '@nestjs/common';
import {
  applyStoreFilter,
  type CatalogStore,
  type Cuisine,
  hasOffer,
  type HomeScreen,
  type HomeSection,
  inSearchScope,
  type OffersQuery,
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
import { OffersService } from '../offers/offers.service.js';
import { feeFrom, toCatalogStore, toCategory, toCuisine, toHomeTile } from './store-view.js';

/** Suggestions shown while typing. */
const SUGGESTIONS = 8;

const TRENDING_DAYS = 7;
const TRENDING_COUNT = 8;

/** One spelling per word: trimmed, single spaces, lower case. */
export const searchTerm = (q: string) => q.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 100);

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
    private readonly offers: OffersService,
  ) {}

  /** The chosen address's zone and spot; none chosen lists every store (§8.9). */
  private async deliverTo(userId: number, addressId?: number): Promise<{ zoneId?: number; from?: LatLng }> {
    if (addressId === undefined) return {};
    const address = await this.addresses.findOf(userId, addressId);
    return { zoneId: address.zoneId, from: { lat: address.lat, lng: address.lng } };
  }

  /** A store list (§8.3): its type, cuisine and search box, then the sort sheet, rating sheet and chips. */
  async stores(userId: number, query: { vertical?: Vertical; cuisineId?: number; q?: string; addressId?: number } & StoreFilter): Promise<CatalogStore[]> {
    const { sort, minRating, fast, pickup, discounts, freeDelivery, addressId, ...where } = query;
    const { zoneId, from } = await this.deliverTo(userId, addressId);
    const rows = await this.catalog.listStores({ ...where, zoneId, activeOnly: true });
    return applyStoreFilter(await this.toStores(rows, from), { sort, minRating, fast, pickup, discounts, freeDelivery }, from);
  }

  /** The offers screen (§8.10): the stores with this kind of offer, in a tab's scope. */
  async offerStores(userId: number, query: OffersQuery): Promise<CatalogStore[]> {
    const { zoneId, from } = await this.deliverTo(userId, query.addressId);
    const rows = (await this.catalog.listStores({ zoneId, activeOnly: true })).filter((r) => inSearchScope(r.vertical, query.scope));
    return (await this.toStores(rows, from)).filter((s) => hasOffer(s.offers, query.kind));
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
    const results = stores.map((store) => ({ store, products: products.filter((p) => p.storeId === store.id) }));
    // Only the "all" tab counts: switching tabs is the same search (L1 #4).
    if (scope === 'all' && results.length) await this.catalog.logSearch(searchTerm(q));
    return results;
  }

  /** "الفيوم بتطلب إيه النهارده" (L1 #4): the week's most searched words that found something. */
  async trending(): Promise<string[]> {
    return this.catalog.topSearches(new Date(Date.now() - TRENDING_DAYS * 24 * 3600_000), TRENDING_COUNT);
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
    const [cuisineIds, rule, offers] = await Promise.all([this.catalog.cuisineIdsOf(rows.map((r) => r.id)), this.settings.delivery(), this.offers.storeOffers(rows)]);
    const now = new Date();
    return rows.map((row) => toCatalogStore(row, cuisineIds.get(row.id) ?? [], now, feeFrom(row, from, rule), offers.get(row.id)!));
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
    const [cuisineIds, categories, rows, rule, offers, vouchers] = await Promise.all([
      this.catalog.cuisineIdsOf([id]),
      this.catalog.listCategories(id),
      // Switched-off products come too: the app greys them with "غير متوفر", as Tawsilty does.
      this.catalog.listProducts(id),
      this.settings.delivery(),
      this.offers.storeOffers([row]),
      this.offers.vouchersFor(id),
    ]);
    const products = await this.catalog.withChoices(rows);
    const all = categories.map((c) => {
      const items = products.filter((p) => p.categoryId === c.id);
      return { ...toCategory(c, items.length), products: items };
    });
    const filled = new Set(all.filter((c) => c.products.length).flatMap((c) => (c.parentId ? [c.id, c.parentId] : [c.id])));
    return {
      ...toCatalogStore(row, cuisineIds.get(id) ?? [], new Date(), feeFrom(row, from, rule), offers.get(id)!),
      categories: all.filter((c) => filled.has(c.id)),
      vouchers,
    };
  }

  /** The customer home (§8.2): the tiles customers may open, the invite card's rewards and the banners. */
  async home(): Promise<HomeScreen> {
    const tiles = (await this.catalog.listVisibleHomeTiles()).map(toHomeTile);
    const banners = await Promise.all(
      (await this.offers.homeBanners()).map(async ({ banner, store }) => ({
        id: banner.id,
        image: banner.image,
        place: banner.place,
        opens: banner.opens,
        store,
        products: banner.place === 'rail' ? await this.catalog.withChoices(await this.offers.railProducts(store.id)) : [],
      })),
    );
    return { tiles, invite: await this.invites.rewards(), banners, sections: await this.homeSections() };
  }

  /** The coloured sections (L1 #2), each with its stores customers can see, in order; empty ones are left out. */
  private async homeSections(): Promise<HomeSection[]> {
    const rows = await this.catalog.listHomeSections();
    const storeIds = await this.catalog.homeSectionStoreIds(rows.map((r) => r.id));
    const all = await this.storesByIds([...new Set([...storeIds.values()].flat())]);
    const byId = new Map(all.map((s) => [s.id, s]));
    return rows
      .map((r) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        background: r.background,
        ink: r.ink,
        stores: (storeIds.get(r.id) ?? []).flatMap((id) => byId.get(id) ?? []),
      }))
      .filter((s) => s.stores.length > 0);
  }

  async cuisines(): Promise<Cuisine[]> {
    return (await this.catalog.listCuisines()).map(toCuisine);
  }
}

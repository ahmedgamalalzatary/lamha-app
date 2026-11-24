// Store lists (contract §8.3) and search (§8.13): the sort sheet, the rating sheet and the chips.

import { distanceKm, type LatLng } from './address.js';
import type { CatalogStore, Product } from './catalog.js';
import type { Vertical } from './enums.js';

/** رتب حسب: الافتراضي · الأقرب إليك · الأعلى تقييماً · الأحدث. */
export const STORE_SORTS = ['default', 'nearest', 'rating', 'newest'] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

/** التقييم: الكل, then these floors ("3.0 فأعلى"). */
export const RATING_FLOORS = [3, 3.5, 4, 4.5] as const;

/** [Open] "توصيل سريع": Tawsilty does not say what counts as fast. Delivery in this many minutes or less. */
export const FAST_DELIVERY_MINUTES = 30;

export interface StoreFilter {
  sort?: StoreSort;
  minRating?: number;
  /** توصيل سريع */
  fast?: boolean;
  /** الاستلام */
  pickup?: boolean;
}

export type ListedStore = Pick<CatalogStore, 'id' | 'rating' | 'ratingCount' | 'deliveryMinutes' | 'pickupAllowed'> & {
  location?: LatLng | null;
};

const byRating = (a: ListedStore, b: ListedStore) => {
  if (a.rating === b.rating) return b.ratingCount - a.ratingCount || a.id - b.id;
  if (a.rating === null) return 1;
  if (b.rating === null) return -1;
  return b.rating - a.rating;
};

/**
 * Filters and sorts a store list, given in the admin's order. A new store (no rating yet, "جديد")
 * passes no rating floor and goes last when sorting by rating. "الأقرب إليك" sorts by distance from
 * the chosen address (`from`); stores with no location go last, and with no address it keeps the admin's order.
 */
export function applyStoreFilter<T extends ListedStore>(stores: readonly T[], filter: StoreFilter, from?: LatLng): T[] {
  const kept = stores.filter(
    (s) =>
      (filter.minRating === undefined || (s.rating !== null && s.rating >= filter.minRating)) &&
      (!filter.fast || s.deliveryMinutes <= FAST_DELIVERY_MINUTES) &&
      (!filter.pickup || s.pickupAllowed),
  );
  if (filter.sort === 'rating') return kept.sort(byRating);
  if (filter.sort === 'newest') return kept.sort((a, b) => b.id - a.id);
  if (filter.sort === 'nearest' && from) {
    const away = (s: T) => (s.location ? distanceKm(from, s.location) : Number.POSITIVE_INFINITY);
    return kept.sort((a, b) => away(a) - away(b));
  }
  return kept;
}

/** Search tabs (§8.13): الكل · مطاعم · متاجر أخرى. */
export const SEARCH_SCOPES = ['all', 'restaurants', 'others'] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export const inSearchScope = (vertical: Vertical, scope: SearchScope) =>
  scope === 'all' || (scope === 'restaurants') === (vertical === 'restaurant');

/** GET /v1/catalog/search: each matching store, followed by its matching products. */
export interface SearchResult {
  store: CatalogStore;
  products: Product[];
}

/** GET /v1/catalog/search/suggestions: a product name, "في المطاعم". */
export interface SearchSuggestion {
  name: string;
  vertical: Vertical;
}

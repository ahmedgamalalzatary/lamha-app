import type { CatalogStore, Cuisine, SearchResult, SearchScope, SearchSuggestion, StoreFilter, Vertical } from '@tawsela/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';

export interface StoresQuery extends StoreFilter {
  vertical: Vertical;
  cuisineId?: number;
  q?: string;
}

/** Query string from the set values only. */
const qs = (params: Record<string, string | number | boolean | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

/** A store list (contract §8.3). The old list stays up while a new filter loads. */
export const useStores = (query: StoresQuery) =>
  useQuery({
    queryKey: ['stores', query],
    queryFn: () => api<CatalogStore[]>(`/catalog/stores?${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });

/** Cuisine circles (restaurants only). */
export const useCuisines = (enabled: boolean) =>
  useQuery({ queryKey: ['cuisines'], queryFn: () => api<Cuisine[]>('/catalog/cuisines'), enabled, staleTime: 5 * 60_000 });

/** Search results (contract §8.13): each store with its matching products. */
export const useSearch = (q: string, scope: SearchScope) =>
  useQuery({
    queryKey: ['search', q, scope],
    queryFn: () => api<SearchResult[]>(`/catalog/search?${qs({ q, scope })}`),
    enabled: q.trim().length > 0,
  });

/** Product names while typing. */
export const useSuggestions = (q: string, scope: SearchScope) =>
  useQuery({
    queryKey: ['suggestions', q, scope],
    queryFn: () => api<SearchSuggestion[]>(`/catalog/search/suggestions?${qs({ q, scope })}`),
    enabled: q.trim().length > 0,
    // The last answer stays while typing, but never across tabs: they list different stores.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === scope ? previous : undefined),
  });

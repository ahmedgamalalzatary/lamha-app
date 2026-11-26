import type { CatalogStore, Cuisine, SearchResult, SearchScope, SearchSuggestion, StoreFilter, Vertical } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useDeliveryScope } from '@/features/addresses/hooks/chosen-address';

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

/**
 * A store list (contract §8.3): only the stores of the chosen address's zone, "الأقرب إليك" measured
 * from it (§8.9). The old list stays up while a new filter loads, never while another address's
 * loads: it lists another zone's stores (review F78).
 */
export function useStores(query: StoresQuery) {
  const { ready, addressId } = useDeliveryScope();
  return useQuery({
    queryKey: ['stores', query, addressId],
    queryFn: () => api<CatalogStore[]>(`/catalog/stores?${qs({ ...query, addressId })}`),
    enabled: ready,
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === addressId ? previous : undefined),
  });
}

/** Cuisine circles (restaurants only). */
export const useCuisines = (enabled: boolean) =>
  useQuery({ queryKey: ['cuisines'], queryFn: () => api<Cuisine[]>('/catalog/cuisines'), enabled, staleTime: 5 * 60_000 });

/** Search results (contract §8.13): each store of the chosen address's zone with its matching products. */
export function useSearch(q: string, scope: SearchScope) {
  const { ready, addressId } = useDeliveryScope();
  return useQuery({
    queryKey: ['search', q, scope, addressId],
    queryFn: () => api<SearchResult[]>(`/catalog/search?${qs({ q, scope, addressId })}`),
    enabled: ready && q.trim().length > 0,
  });
}

/** Product names while typing, from the stores of the chosen address's zone (review F32). */
export function useSuggestions(q: string, scope: SearchScope) {
  const { ready, addressId } = useDeliveryScope();
  return useQuery({
    queryKey: ['suggestions', q, scope, addressId],
    queryFn: () => api<SearchSuggestion[]>(`/catalog/search/suggestions?${qs({ q, scope, addressId })}`),
    enabled: ready && q.trim().length > 0,
    // The last answer stays while typing, but never across tabs or addresses: they list different stores.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === scope && previousQuery.queryKey[3] === addressId ? previous : undefined,
  });
}

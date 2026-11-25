import type { CatalogStore, StorePage } from '@tawsela/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useDeliveryScope } from '@/features/addresses/chosen-address';

/**
 * A store page (contract §8.4): the store, its categories and their products with choices. Its delivery
 * fee is the one to the chosen address (§8.7); it waits for the addresses so the fee never jumps.
 */
export function useStorePage(id: number) {
  const scope = useDeliveryScope();
  const addressId = scope.addressId;
  return useQuery({
    queryKey: ['store', id, addressId ?? null],
    queryFn: () => api<StorePage>(addressId === undefined ? `/catalog/stores/${id}` : `/catalog/stores/${id}?addressId=${addressId}`),
    enabled: Number.isInteger(id) && (scope.ready || scope.failed),
  });
}

const FAVORITES = ['favorites'] as const;

/** The customer's favourite stores (§8.14 "الخدمات المفضلة"), the newest first. */
export const useFavorites = () => useQuery({ queryKey: FAVORITES, queryFn: () => api<CatalogStore[]>('/me/favorites') });

/** The heart on the store page: adds or removes, then the list reloads. */
export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, on }: { storeId: number; on: boolean }) =>
      api<void>(`/me/favorites/${storeId}`, { method: on ? 'PUT' : 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: FAVORITES }),
  });
}

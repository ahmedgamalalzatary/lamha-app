import type { CatalogStore, StorePage } from '@tawsela/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';

/** A store page (contract §8.4): the store, its categories and their products with choices. */
export const useStorePage = (id: number) =>
  useQuery({ queryKey: ['store', id], queryFn: () => api<StorePage>(`/catalog/stores/${id}`), enabled: Number.isInteger(id) });

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

import type { CatalogStore, OfferKind, SearchScope } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useDeliveryScope } from '@/features/addresses/hooks/chosen-address';

/** The stores with this kind of offer, of the chosen address's zone (§8.9). */
export function useOfferStores(kind: OfferKind, scope: SearchScope) {
  const { ready, addressId } = useDeliveryScope();
  const address = addressId === undefined ? '' : `&addressId=${addressId}`;
  return useQuery({
    queryKey: ['offers', kind, scope, addressId],
    queryFn: () => api<CatalogStore[]>(`/catalog/offers?kind=${kind}&scope=${scope}${address}`),
    enabled: ready,
  });
}

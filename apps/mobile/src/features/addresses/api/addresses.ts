import type { Address, AddressInput, LatLng, ZoneCheck } from '@tawsela/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

const KEY = ['addresses'] as const;

/** "العناوين المحفوظة": the default first, then the newest. Customers only (contract §8.9). */
export function useAddresses() {
  const isCustomer = useSession((s) => s.user?.role === 'customer');
  return useQuery({ queryKey: KEY, queryFn: () => api<Address[]>('/me/addresses'), enabled: isCustomer });
}

/** Saves and deletes; each returns once the list is fresh again, so screens run them with useSubmit. */
export function useAddressActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });
  return {
    /** A new address (no id), or a replacement for one. */
    save: async ({ id, ...body }: AddressInput & { id?: number }) => {
      const saved = await api<Address>(id ? `/me/addresses/${id}` : '/me/addresses', { method: id ? 'PUT' : 'POST', body });
      await refresh();
      return saved;
    },
    remove: async (id: number) => {
      await api<void>(`/me/addresses/${id}`, { method: 'DELETE' });
      await refresh();
    },
  };
}

/** "التوصيل متاح لهذا الموقع": the zone this spot is in, if any. */
export const useZoneCheck = (spot: LatLng | null) =>
  useQuery({
    queryKey: ['zone-check', spot?.lat, spot?.lng],
    queryFn: () => api<ZoneCheck>('/zones/check', { method: 'POST', body: spot }),
    enabled: spot !== null,
  });

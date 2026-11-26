import type { CustomerOrder, CustomerOrderDetails, ReorderResult } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

/** Every customer order query starts with this, so one live status change refreshes them all. */
export const ordersKey = ['orders'] as const;

export const ordersApi = {
  list: () => api<CustomerOrder[]>('/me/orders'),
  details: (id: number) => api<CustomerOrderDetails>(`/me/orders/${id}`),
  reorder: (id: number) => api<ReorderResult>(`/me/orders/${id}/reorder`, { method: 'POST' }),
};

/** "تفاصيل الطلب" (§8.8). */
export function useMyOrder(id: number) {
  const userId = useSession((s) => (s.user?.role === 'customer' ? s.user.id : undefined));
  return useQuery({
    queryKey: [...ordersKey, userId, id],
    queryFn: () => ordersApi.details(id),
    enabled: userId !== undefined && Number.isInteger(id),
  });
}

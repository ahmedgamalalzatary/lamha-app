'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminOrder, OrderStatus } from '@tawsela/shared';
import { api } from '@/core/api/client';

/** الطلبات: one status tab, or every order. */
export const useAdminOrders = (status?: OrderStatus) =>
  useQuery({
    queryKey: ['admin', 'orders', status ?? 'all'],
    queryFn: () => api.request<AdminOrder[]>(status ? `/admin/orders?status=${status}` : '/admin/orders'),
    // New orders come in all the time; the table looks again every half minute.
    refetchInterval: 30_000,
  });

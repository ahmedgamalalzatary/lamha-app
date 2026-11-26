'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerAccount, PointsAdjustInput, WalletAdjustInput } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'customers'] as const;

/** العملاء, newest first, optionally matching a name, phone or email. */
export const useCustomers = (q = '') =>
  useQuery({
    queryKey: [...KEY, q.trim()],
    queryFn: () => api.request<CustomerAccount[]>(q.trim() ? `/admin/customers?q=${encodeURIComponent(q.trim())}` : '/admin/customers'),
  });

/** Points: إضافة or خصم with a reason; the list shows the new balance afterwards. */
export function useAdjustPoints() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: PointsAdjustInput & { id: number }) => api.request<{ balance: number }>(`/admin/customers/${id}/points`, { method: 'POST', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** إضافة or خصم with a reason; the list shows the new balance afterwards. */
export function useAdjustWallet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: WalletAdjustInput & { id: number }) => api.request<{ balance: number }>(`/admin/customers/${id}/wallet`, { method: 'POST', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

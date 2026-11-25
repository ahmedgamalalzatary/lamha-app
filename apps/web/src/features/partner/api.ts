'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus, PartnerAction, PartnerOrder, PartnerOrderCounts, PartnerOrderDetails, PartnerStore, PartnerStoreInput } from '@tawsela/shared';
import { api } from '@/core/api/client';

/** Every query about the store's orders starts with this key, so one refresh covers them all. */
export const partnerOrdersKey = ['partner', 'orders'] as const;

/** One status tab of the store's orders. A slow fallback refresh in case the live socket is down. */
export const usePartnerOrders = (status: OrderStatus) =>
  useQuery({
    queryKey: [...partnerOrdersKey, 'list', status],
    queryFn: () => api.request<PartnerOrder[]>(`/partner/orders?status=${status}`),
    refetchInterval: 60_000,
  });

export const usePartnerOrder = (id: number | undefined) =>
  useQuery({
    queryKey: [...partnerOrdersKey, 'one', id],
    queryFn: () => api.request<PartnerOrderDetails>(`/partner/orders/${id}`),
    enabled: id !== undefined,
  });

export const usePartnerOrderCounts = () =>
  useQuery({ queryKey: [...partnerOrdersKey, 'counts'], queryFn: () => api.request<PartnerOrderCounts>('/partner/orders/counts') });

/** قبول, رفض, تم التجهيز, تم الاستلام. Either way the lists are read again: a 409 means it moved on elsewhere. */
export function usePartnerStep() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: PartnerAction }) =>
      api.request<PartnerOrderDetails>(`/partner/orders/${id}/${action}`, { method: 'POST' }),
    onSettled: () => queries.invalidateQueries({ queryKey: partnerOrdersKey }),
  });
}

export const usePartnerStore = () => useQuery({ queryKey: ['partner', 'store'], queryFn: () => api.request<PartnerStore>('/partner/store') });

export function useUpdatePartnerStore() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PartnerStoreInput>) => api.request<PartnerStore>('/partner/store', { method: 'PATCH', body }),
    onSuccess: (store) => queries.setQueryData(['partner', 'store'], store),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeliverySettings } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'settings', 'delivery'] as const;

export const useDeliverySettings = () => useQuery({ queryKey: KEY, queryFn: () => api.request<DeliverySettings>('/admin/settings/delivery') });

export function useSaveDeliverySettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverySettings) => api.request<DeliverySettings>('/admin/settings/delivery', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(KEY, saved),
  });
}

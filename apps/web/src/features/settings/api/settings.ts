'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeliverySettings, PointsSettings } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'settings', 'delivery'] as const;

export const useDeliverySettings = () => useQuery({ queryKey: KEY, queryFn: () => api.request<DeliverySettings>('/admin/settings/delivery') });

const POINTS_KEY = ['admin', 'settings', 'points'] as const;

export const usePointsSettings = () => useQuery({ queryKey: POINTS_KEY, queryFn: () => api.request<PointsSettings>('/admin/settings/points') });

export function useSavePointsSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: PointsSettings) => api.request<PointsSettings>('/admin/settings/points', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(POINTS_KEY, saved),
  });
}

export function useSaveDeliverySettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverySettings) => api.request<DeliverySettings>('/admin/settings/delivery', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(KEY, saved),
  });
}

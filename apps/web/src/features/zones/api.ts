'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Zone, ZoneInput } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'zones'] as const;

export const useZones = () => useQuery({ queryKey: KEY, queryFn: () => api.request<Zone[]>('/admin/zones') });

/** Adds a zone (no id) or changes one. */
export function useSaveZone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ZoneInput & { id?: number }) =>
      api.request<Zone>(id ? `/admin/zones/${id}` : '/admin/zones', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

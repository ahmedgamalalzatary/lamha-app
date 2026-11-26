import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteSettings } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'settings', 'invites'] as const;

export const useInviteSettings = () => useQuery({ queryKey: KEY, queryFn: () => api.request<InviteSettings>('/admin/settings/invites') });

export function useSaveInviteSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteSettings) => api.request<InviteSettings>('/admin/settings/invites', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(KEY, saved),
  });
}

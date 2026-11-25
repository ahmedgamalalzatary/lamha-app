'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Campaign, CampaignInput } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'campaigns'] as const;

export const useCampaigns = () => useQuery({ queryKey: KEY, queryFn: () => api.request<Campaign[]>('/admin/campaigns') });

export function useSendCampaign() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignInput) => api.request<Campaign>('/admin/campaigns', { method: 'POST', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

import { useInfiniteQuery } from '@tanstack/react-query';
import type { AuditPage } from '@tawsela/shared';
import { api } from '@/core/api/client';

export function useAuditLog() {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }) => api.request<AuditPage>(`/admin/audit${pageParam ? `?before=${pageParam}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
  });
}

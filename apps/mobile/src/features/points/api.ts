import type { MyPoints } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

export const pointsKey = ['points'] as const;

export const pointsApi = {
  get: () => api<MyPoints>('/me/points'),
};

/** نقاطي: the balance, its value, the rules and the movements (customers only). */
export function usePoints() {
  const user = useSession((s) => s.user);
  return useQuery({ queryKey: [...pointsKey, user?.id], queryFn: pointsApi.get, enabled: user?.role === 'customer' });
}

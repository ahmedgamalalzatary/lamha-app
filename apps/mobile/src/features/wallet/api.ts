import type { Wallet } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

export const walletKey = ['wallet'] as const;

export const walletApi = {
  get: () => api<Wallet>('/me/wallet'),
};

/** حركة المحفظة: the balance and its movements, newest first (customers only). */
export function useWallet() {
  const user = useSession((s) => s.user);
  return useQuery({ queryKey: [...walletKey, user?.id], queryFn: walletApi.get, enabled: user?.role === 'customer' });
}

import type { AddCartLine, CartMode, CartResponse } from '@tawsela/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';

const path = '/me/cart';

export const cartApi = {
  get: () => api<CartResponse>(path),
  add: (body: AddCartLine) => api<CartResponse>(`${path}/lines`, { method: 'POST', body }),
  adjust: (id: number, delta: -1 | 1) => api<CartResponse>(`${path}/lines/${id}`, { method: 'PATCH', body: { delta } }),
  remove: (id: number) => api<CartResponse>(`${path}/lines/${id}`, { method: 'DELETE' }),
  edit: (body: { cartId: number; note?: string; mode?: CartMode }) => api<CartResponse>(path, { method: 'PATCH', body }),
  validate: () => api<CartResponse>(`${path}/validate`, { method: 'POST' }),
};

/** Store screens and the cart tab read the same account-scoped snapshot. */
export function useCart() {
  const userId = useSession((s) => (s.user?.role === 'customer' ? s.user.id : undefined));
  const key = ['cart', userId] as const;
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: cartApi.get, enabled: userId !== undefined });
  const mutation = useMutation({
    // A delayed response from one button cannot undo a newer change from another screen.
    scope: { id: `cart:${userId}` },
    mutationFn: async ({ run, generation }: { run: () => Promise<CartResponse>; generation: number }) => {
      if (session.generation() !== generation || !userId || useSession.getState().user?.id !== userId) {
        throw new Error('The customer session changed');
      }
      const result = await run();
      await client.cancelQueries({ queryKey: key, exact: true });
      if (session.generation() === generation) client.setQueryData(key, result);
      return result;
    },
  });
  const run = (operation: () => Promise<CartResponse>) => mutation.mutateAsync({ run: operation, generation: session.generation() });
  return { query, cart: query.data?.cart, run };
}

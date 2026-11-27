import type { AddCartLine, CartMode, CartResponse, CartsResponse } from '@tawsela/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';

export const cartApi = {
  /** "سلاتي": one cart per store (contract §8.6). */
  list: () => api<CartsResponse>('/me/carts'),
  clearAll: () => api<CartsResponse>('/me/carts', { method: 'DELETE' }),
  /** سلاتي's delete on one store's card: the carts left. */
  clearStore: (storeId: number) => api<CartsResponse>(`/me/carts/${storeId}`, { method: 'DELETE' }),
  get: (storeId: number) => api<CartResponse>(`/me/carts/${storeId}`),
  /** Goes to the cart of the product's store. */
  add: (body: AddCartLine) => api<CartResponse>('/me/cart/lines', { method: 'POST', body }),
  adjust: (id: number, delta: -1 | 1) => api<CartResponse>(`/me/cart/lines/${id}`, { method: 'PATCH', body: { delta } }),
  remove: (id: number) => api<CartResponse>(`/me/cart/lines/${id}`, { method: 'DELETE' }),
  edit: (body: { cartId: number; note?: string; mode?: CartMode }) => api<CartResponse>('/me/cart', { method: 'PATCH', body }),
  validate: (storeId: number) => api<CartResponse>(`/me/carts/${storeId}/validate`, { method: 'POST' }),
};

const customerId = (s: ReturnType<typeof useSession.getState>) => (s.user?.role === 'customer' ? s.user.id : undefined);

export const cartKeys = {
  list: (userId: number | undefined) => ['carts', userId] as const,
  store: (userId: number | undefined, storeId: number) => ['cart', userId, storeId] as const,
};

/** After a store's cart changed: "سلاتي" counts again. */
export function cartChanged(client: QueryClient, userId: number | undefined) {
  void client.invalidateQueries({ queryKey: cartKeys.list(userId), exact: true });
}

/** "سلاتي": the customer's carts, newest first. */
export function useCarts() {
  const userId = useSession(customerId);
  return useQuery({ queryKey: cartKeys.list(userId), queryFn: cartApi.list, enabled: userId !== undefined });
}

/** One store's cart: the store screens, its cart screen and checkout read the same account-scoped snapshot. */
export function useCart(storeId: number) {
  const userId = useSession(customerId);
  const key = cartKeys.store(userId, storeId);
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: () => cartApi.get(storeId), enabled: userId !== undefined && storeId > 0 });
  const mutation = useMutation({
    // A delayed response from one button cannot undo a newer change from another screen.
    scope: { id: `cart:${userId}` },
    mutationFn: async ({ run, generation }: { run: () => Promise<CartResponse>; generation: number }) => {
      const current = () => session.generation() === generation && userId !== undefined && useSession.getState().user?.id === userId;
      if (!current()) {
        throw new Error('The customer session changed');
      }
      try {
        const result = await run();
        if (current()) {
          await client.cancelQueries({ queryKey: key, exact: true });
          if (current()) {
            client.setQueryData(key, result);
            cartChanged(client, userId);
          }
        }
        return result;
      } catch (e) {
        if (current() && e instanceof ApiRequestError && (e.status === 404 || e.status === 409)) {
          void client.invalidateQueries({ queryKey: key, exact: true });
        }
        throw e;
      }
    },
  });
  const run = (operation: () => Promise<CartResponse>) => mutation.mutateAsync({ run: operation, generation: session.generation() });
  return { query, cart: query.data?.cart, run };
}

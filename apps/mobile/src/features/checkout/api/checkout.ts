import type { CheckoutQuote, CheckoutQuoteInput, PlacedOrder, PlaceOrderInput } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';
import { ordersApi } from '@/features/orders/api/orders';

export const checkoutApi = {
  quote: (body: CheckoutQuoteInput) => api<CheckoutQuote>('/me/checkout/quote', { method: 'POST', body }),
  place: (body: PlaceOrderInput) => api<PlacedOrder>('/me/orders', { method: 'POST', body }),
};

export function useCheckoutQuote(
  queryKey: readonly unknown[],
  body: CheckoutQuoteInput,
  enabled: boolean,
  onQuoteError: (error: unknown) => void,
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await checkoutApi.quote(body);
      } catch (error) {
        onQuoteError(error);
        throw error;
      }
    },
    enabled,
  });
}

/** طلباتي (§8.8): the customer's orders, newest first. */
export function useMyOrders() {
  const userId = useSession((s) => (s.user?.role === 'customer' ? s.user.id : undefined));
  return useQuery({ queryKey: ['orders', userId], queryFn: ordersApi.list, enabled: userId !== undefined });
}

/**
 * One key per checkout visit: a retried "تنفيذ الطلب" (a lost answer, a double tap) places one order.
 * Not a secret, so Math.random is enough; the server only matches it per customer.
 */
export function newRequestId(): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

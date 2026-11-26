import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, OrderStatus, PartnerAction, PartnerOrder, PartnerOrderCounts, PartnerOrderDetails, Product } from '@tawsela/shared';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

/** The signed-in partner, so one partner never sees the previous one's cached orders. */
const usePartnerId = () => useSession((s) => (s.user?.role === 'partner' ? s.user.id : undefined));

/** Every query about the store's orders starts with this key, so one refresh covers them all. */
export const partnerOrdersKey = ['partner', 'orders'] as const;

/** One status of the store's orders, newest first. A slow fallback refresh in case the socket is down. */
export function usePartnerOrders(status: OrderStatus) {
  const id = usePartnerId();
  return useQuery({
    queryKey: [...partnerOrdersKey, id, 'list', status],
    queryFn: () => api<PartnerOrder[]>(`/partner/orders?status=${status}`),
    enabled: id !== undefined,
    refetchInterval: 60_000,
  });
}

export function usePartnerOrder(orderId: number | undefined) {
  const id = usePartnerId();
  return useQuery({
    queryKey: [...partnerOrdersKey, id, 'one', orderId],
    queryFn: () => api<PartnerOrderDetails>(`/partner/orders/${orderId}`),
    enabled: id !== undefined && orderId !== undefined,
  });
}

export function usePartnerOrderCounts() {
  const id = usePartnerId();
  return useQuery({
    queryKey: [...partnerOrdersKey, id, 'counts'],
    queryFn: () => api<PartnerOrderCounts>('/partner/orders/counts'),
    enabled: id !== undefined,
  });
}

/**
 * قبول, رفض, تم التجهيز, تم الاستلام; قبول of a pharmacy request carries its price (§8.11). Either way the
 * lists are read again: a 409 means it moved on elsewhere.
 */
export function usePartnerStep() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, price }: { id: number; action: PartnerAction; price?: number }) =>
      api<PartnerOrderDetails>(`/partner/orders/${id}/${action}`, { method: 'POST', body: price === undefined ? undefined : { price } }),
    onSettled: () => queries.invalidateQueries({ queryKey: partnerOrdersKey }),
  });
}

/** منتجات: the store's menu. */
export function usePartnerMenu() {
  const id = usePartnerId();
  const categories = useQuery({ queryKey: ['partner', 'menu', id, 'categories'], queryFn: () => api<Category[]>('/partner/categories'), enabled: id !== undefined });
  const products = useQuery({ queryKey: ['partner', 'menu', id, 'products'], queryFn: () => api<Product[]>('/partner/products'), enabled: id !== undefined });
  return { categories, products };
}

/** The متاح switch: shown at once, put back if the server refuses. */
export function useProductAvailability() {
  const queries = useQueryClient();
  const id = usePartnerId();
  const key = ['partner', 'menu', id, 'products'];
  return useMutation({
    mutationFn: ({ productId, active }: { productId: number; active: boolean }) =>
      api<Product>(`/partner/products/${productId}`, { method: 'PATCH', body: { active } }),
    onMutate: async ({ productId, active }) => {
      await queries.cancelQueries({ queryKey: key });
      const before = queries.getQueryData<Product[]>(key);
      queries.setQueryData<Product[]>(key, (list) => list?.map((p) => (p.id === productId ? { ...p, active } : p)));
      return { before };
    },
    onError: (_e, _v, context) => queries.setQueryData(key, context?.before),
    onSettled: () => queries.invalidateQueries({ queryKey: key }),
  });
}

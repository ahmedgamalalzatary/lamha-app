'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminBanner, AdminCoupon, BannerInput, CouponInput, Product, ProductDiscountInput } from '@tawsela/shared';
import { api } from '@/core/api/client';

const COUPONS = ['admin', 'coupons'] as const;
const BANNERS = ['admin', 'banners'] as const;

export const useCoupons = () => useQuery({ queryKey: COUPONS, queryFn: () => api.request<AdminCoupon[]>('/admin/coupons') });

/** Makes a code (no id) or changes one. */
export function useSaveCoupon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CouponInput> & { id?: number }) =>
      id === undefined
        ? api.request<AdminCoupon>('/admin/coupons', { method: 'POST', body })
        : api.request<AdminCoupon>(`/admin/coupons/${id}`, { method: 'PATCH', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: COUPONS }),
  });
}

export function useDeleteCoupon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.request<void>(`/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: COUPONS }),
  });
}

export const useBanners = () => useQuery({ queryKey: BANNERS, queryFn: () => api.request<AdminBanner[]>('/admin/banners') });

export function useSaveBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<BannerInput> & { id?: number }) =>
      id === undefined
        ? api.request<AdminBanner>('/admin/banners', { method: 'POST', body })
        : api.request<AdminBanner>(`/admin/banners/${id}`, { method: 'PATCH', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: BANNERS }),
  });
}

export function useDeleteBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.request<void>(`/admin/banners/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: BANNERS }),
  });
}

/** A store's products, for خصومات المنتجات. */
export const useStoreProducts = (storeId: number | undefined) =>
  useQuery({
    queryKey: ['admin', 'discounts', storeId],
    queryFn: () => api.request<Product[]>(`/admin/stores/${storeId}/products`),
    enabled: storeId !== undefined,
  });

export function useSetDiscount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...body }: ProductDiscountInput & { productId: number }) =>
      api.request<Product>(`/admin/products/${productId}/discount`, { method: 'PUT', body }),
    onSuccess: (product) => client.invalidateQueries({ queryKey: ['admin', 'discounts', product.storeId] }),
  });
}

'use client';

import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminProduct,
  AdminStore,
  Category,
  CreatedAccount,
  CreatedStore,
  Cuisine,
  GeneratedPassword,
  HomeTile,
  PartnerAccount,
  Product,
  ProductOptionsInput,
  StoreInput,
} from '@tawsela/shared';
import { api } from '@/core/api/client';

/** Every catalog query starts with this key, so a change can refresh them all. */
const ROOT = ['admin', 'catalog'] as const;

/** A change to the catalog refreshes every catalog list afterwards (they are small). */
function useCatalogMutation<A, R>(fn: (args: A) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: ROOT }) });
}

const key = (...parts: unknown[]): QueryKey => [...ROOT, ...parts];

// Stores

export const useStores = () => useQuery({ queryKey: key('stores'), queryFn: () => api.request<AdminStore[]>('/admin/stores') });

export const useStore = (id: number | undefined) =>
  useQuery({ queryKey: key('store', id), queryFn: () => api.request<AdminStore>(`/admin/stores/${id}`), enabled: id !== undefined });

export type NewStore = StoreInput & { partner: { firstName: string; lastName: string; phone: string } };

export const useCreateStore = () => useCatalogMutation((body: NewStore) => api.request<CreatedStore>('/admin/stores', { method: 'POST', body }));

export const useUpdateStore = () =>
  useCatalogMutation(({ id, ...body }: Partial<StoreInput> & { id: number }) => api.request<AdminStore>(`/admin/stores/${id}`, { method: 'PATCH', body }));

// Partner accounts

export const useStorePartners = (storeId: number) =>
  useQuery({ queryKey: key('partners', storeId), queryFn: () => api.request<PartnerAccount[]>(`/admin/partners?storeId=${storeId}`) });

export const useCreatePartner = () =>
  useCatalogMutation((body: { storeId: number; firstName: string; lastName: string; phone: string }) =>
    api.request<CreatedAccount>('/admin/partners', { method: 'POST', body }),
  );

export const useResetPartnerPassword = () =>
  useCatalogMutation((id: number) => api.request<GeneratedPassword>(`/admin/partners/${id}/password`, { method: 'POST' }));

export const useSetPartnerDisabled = () =>
  useCatalogMutation(({ id, disabled }: { id: number; disabled: boolean }) =>
    api.request<PartnerAccount>(`/admin/partners/${id}`, { method: 'PATCH', body: { disabled } }),
  );

// Categories and products

export const useCategories = (storeId: number | undefined) =>
  useQuery({ queryKey: key('categories', storeId), queryFn: () => api.request<Category[]>(`/admin/stores/${storeId}/categories`), enabled: storeId !== undefined });

export const useCreateCategory = () =>
  useCatalogMutation(({ storeId, ...body }: { storeId: number; name: string; image?: string | null; parentId?: number | null }) =>
    api.request<Category>(`/admin/stores/${storeId}/categories`, { method: 'POST', body }),
  );

export const useUpdateCategory = () =>
  useCatalogMutation(({ id, ...body }: { id: number; name?: string; image?: string | null; parentId?: number | null }) =>
    api.request<Category>(`/admin/categories/${id}`, { method: 'PATCH', body }),
  );

export const useDeleteCategory = () => useCatalogMutation((id: number) => api.request<void>(`/admin/categories/${id}`, { method: 'DELETE' }));

export const useOrderCategories = () =>
  useCatalogMutation(({ storeId, ids }: { storeId: number; ids: number[] }) =>
    api.request<Category[]>(`/admin/stores/${storeId}/categories/order`, { method: 'PUT', body: { ids } }),
  );

export const useProducts = (storeId: number | undefined) =>
  useQuery({ queryKey: key('products', storeId), queryFn: () => api.request<Product[]>(`/admin/stores/${storeId}/products`), enabled: storeId !== undefined });

export const useInactiveProducts = () => useQuery({ queryKey: key('inactive'), queryFn: () => api.request<AdminProduct[]>('/admin/products/inactive') });

export type ProductFields = Pick<Product, 'categoryId' | 'name' | 'description' | 'price' | 'unit' | 'image' | 'active'> & Partial<ProductOptionsInput>;

export const useCreateProduct = () =>
  useCatalogMutation(({ storeId, ...body }: ProductFields & { storeId: number }) =>
    api.request<Product>(`/admin/stores/${storeId}/products`, { method: 'POST', body }),
  );

export const useUpdateProduct = () =>
  useCatalogMutation(({ id, ...body }: Partial<ProductFields> & { id: number }) => api.request<Product>(`/admin/products/${id}`, { method: 'PATCH', body }));

export const useDeleteProduct = () => useCatalogMutation((id: number) => api.request<void>(`/admin/products/${id}`, { method: 'DELETE' }));

// Cuisines and home tiles

export const useCuisines = () => useQuery({ queryKey: key('cuisines'), queryFn: () => api.request<Cuisine[]>('/admin/cuisines') });

export const useSaveCuisine = () =>
  useCatalogMutation(({ id, ...body }: { id?: number; name: string; image: string | null }) =>
    id ? api.request<Cuisine>(`/admin/cuisines/${id}`, { method: 'PATCH', body }) : api.request<Cuisine>('/admin/cuisines', { method: 'POST', body }),
  );

export const useDeleteCuisine = () => useCatalogMutation((id: number) => api.request<void>(`/admin/cuisines/${id}`, { method: 'DELETE' }));

export const useOrderCuisines = () => useCatalogMutation((ids: number[]) => api.request<Cuisine[]>('/admin/cuisines/order', { method: 'PUT', body: { ids } }));

export const useHomeTiles = () => useQuery({ queryKey: key('tiles'), queryFn: () => api.request<HomeTile[]>('/admin/home-tiles') });

export type TileFields = Pick<HomeTile, 'label' | 'image' | 'badge' | 'row' | 'targetVertical' | 'targetStoreId'>;

export const useSaveHomeTile = () =>
  useCatalogMutation(({ id, ...body }: TileFields & { id?: number }) =>
    id ? api.request<HomeTile>(`/admin/home-tiles/${id}`, { method: 'PATCH', body }) : api.request<HomeTile>('/admin/home-tiles', { method: 'POST', body }),
  );

export const useDeleteHomeTile = () => useCatalogMutation((id: number) => api.request<void>(`/admin/home-tiles/${id}`, { method: 'DELETE' }));

export const useOrderHomeTiles = () => useCatalogMutation((ids: number[]) => api.request<HomeTile[]>('/admin/home-tiles/order', { method: 'PUT', body: { ids } }));

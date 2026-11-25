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
import { createContext, useContext } from 'react';
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

/**
 * Where a store's menu lives: the admin reaches any store's under /admin/stores/:id, a partner only
 * their own under /partner (contract §11.1). The same menu screens serve both.
 */
export interface MenuPaths {
  /** The store's categories and products lists. */
  store: (storeId: number) => string;
  /** One category or product, by id. */
  item: string;
}

export const ADMIN_MENU: MenuPaths = { store: (storeId) => `/admin/stores/${storeId}`, item: '/admin' };
export const PARTNER_MENU: MenuPaths = { store: () => '/partner', item: '/partner' };

const MenuPathsContext = createContext<MenuPaths>(ADMIN_MENU);
export const MenuPathsProvider = MenuPathsContext.Provider;
const useMenuPaths = () => useContext(MenuPathsContext);

export function useCategories(storeId: number | undefined) {
  const paths = useMenuPaths();
  return useQuery({
    queryKey: key('categories', storeId),
    queryFn: () => api.request<Category[]>(`${paths.store(storeId!)}/categories`),
    enabled: storeId !== undefined,
  });
}

export function useCreateCategory() {
  const paths = useMenuPaths();
  return useCatalogMutation(({ storeId, ...body }: { storeId: number; name: string; image?: string | null; parentId?: number | null }) =>
    api.request<Category>(`${paths.store(storeId)}/categories`, { method: 'POST', body }),
  );
}

export function useUpdateCategory() {
  const paths = useMenuPaths();
  return useCatalogMutation(({ id, ...body }: { id: number; name?: string; image?: string | null; parentId?: number | null }) =>
    api.request<Category>(`${paths.item}/categories/${id}`, { method: 'PATCH', body }),
  );
}

export function useDeleteCategory() {
  const paths = useMenuPaths();
  return useCatalogMutation((id: number) => api.request<void>(`${paths.item}/categories/${id}`, { method: 'DELETE' }));
}

export function useOrderCategories() {
  const paths = useMenuPaths();
  return useCatalogMutation(({ storeId, ids }: { storeId: number; ids: number[] }) =>
    api.request<Category[]>(`${paths.store(storeId)}/categories/order`, { method: 'PUT', body: { ids } }),
  );
}

export function useProducts(storeId: number | undefined) {
  const paths = useMenuPaths();
  return useQuery({
    queryKey: key('products', storeId),
    queryFn: () => api.request<Product[]>(`${paths.store(storeId!)}/products`),
    enabled: storeId !== undefined,
  });
}

export const useInactiveProducts = () => useQuery({ queryKey: key('inactive'), queryFn: () => api.request<AdminProduct[]>('/admin/products/inactive') });

export type ProductFields = Pick<Product, 'categoryId' | 'name' | 'description' | 'price' | 'unit' | 'image' | 'active'> & Partial<ProductOptionsInput>;

export function useCreateProduct() {
  const paths = useMenuPaths();
  return useCatalogMutation(({ storeId, ...body }: ProductFields & { storeId: number }) =>
    api.request<Product>(`${paths.store(storeId)}/products`, { method: 'POST', body }),
  );
}

export function useUpdateProduct() {
  const paths = useMenuPaths();
  return useCatalogMutation(({ id, ...body }: Partial<ProductFields> & { id: number }) =>
    api.request<Product>(`${paths.item}/products/${id}`, { method: 'PATCH', body }),
  );
}

export function useDeleteProduct() {
  const paths = useMenuPaths();
  return useCatalogMutation((id: number) => api.request<void>(`${paths.item}/products/${id}`, { method: 'DELETE' }));
}

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

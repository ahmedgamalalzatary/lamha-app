'use client';

import { errorMessage } from '@/core/api/error-message';
import { LoadState } from '@/components/ui';
import { MenuPathsProvider, PARTNER_MENU } from '../catalog/api';
import { Categories, Products } from '../products/StoreProductsPage';
import { usePartnerStore } from './api';

/**
 * /partner/products (contract §11.1 المنتجات): the admin's menu screens for the partner's own store,
 * through /v1/partner: categories, products, prices, images and the متاح switch. No store picker.
 */
export function PartnerProductsPage() {
  const store = usePartnerStore();
  if (store.isPending || store.isError) {
    return <LoadState error={store.isError ? errorMessage(store.error) : undefined} onRetry={() => void store.refetch()} />;
  }
  return (
    <MenuPathsProvider value={PARTNER_MENU}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <div className="grid items-start gap-6 lg:grid-cols-[21rem_1fr]">
          <Categories storeId={store.data.id} />
          <Products storeId={store.data.id} />
        </div>
      </div>
    </MenuPathsProvider>
  );
}

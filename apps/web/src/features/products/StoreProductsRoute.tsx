'use client';

import { useSearchParams } from 'next/navigation';
import { StoreProductsPage } from './StoreProductsPage';

/** /products?store=<id>: the stores table's "المنتجات" button opens a store here. */
export function StoreProductsRoute() {
  const store = Number(useSearchParams().get('store'));
  return <StoreProductsPage initialStoreId={Number.isInteger(store) && store > 0 ? store : undefined} />;
}

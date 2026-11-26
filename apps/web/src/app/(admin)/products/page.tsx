import { Suspense } from 'react';
import { StoreProductsRoute } from '@/features/products/screens/StoreProductsRoute';

// The search params are only known in the browser, so the page waits for them inside Suspense.
export default function Page() {
  return (
    <Suspense>
      <StoreProductsRoute />
    </Suspense>
  );
}

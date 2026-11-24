import { isCustomizable, type Product } from '@tawsela/shared';
import { useMemo, useState } from 'react';
import { useStoreCart } from '@/features/cart/cart-store';
import type { ProductActions } from '../components/ProductItems';

/**
 * What tapping a product does on a store page: the item opens the sheet; "+" adds a simple item at
 * once and opens the sheet for one with choices. [Open] Tapping the count badge adds one more.
 */
export function useProductTaps(storeId: number) {
  const cart = useStoreCart(storeId);
  const { add, countOf } = cart;
  const [sheet, setSheet] = useState<Product | null>(null);
  const actions: ProductActions = useMemo(
    () => ({
      open: setSheet,
      add: (p) => (isCustomizable(p) ? setSheet(p) : add({ product: p, optionIds: [], removedIngredientIds: [], quantity: 1 })),
      countOf,
    }),
    [add, countOf],
  );
  return { cart, actions, sheet, setSheet };
}

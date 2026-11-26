import { type CartItem, isCustomizable, type Product, quantityOf } from '@tawsela/shared';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { session } from '@/core/auth/session';
import { useT } from '@/core/i18n';
import { cartApi, useCart } from '@/features/cart/api/cart';
import type { ProductActions } from '../components/ProductItems';

/**
 * What tapping a product does on a store page: the item opens the sheet; "+" adds a simple item at
 * once and opens the sheet for one with choices. The count badge ignores taps (AddButton).
 * Each store has its own cart (contract §8.6): the first item starts it with "تمت الاضافة الى السلة".
 */
export function useProductTaps(storeId: number) {
  const t = useT();
  const { cart, run } = useCart(storeId);
  const [sheet, setSheet] = useState<Product | null>(null);
  const countOf = (id: number) => (cart ? quantityOf(cart.lines, id) : 0);

  async function add({ product, ...item }: CartItem<Product>): Promise<boolean> {
    const generation = session.generation();
    const started = !cart;
    await run(() => cartApi.add({ ...item, productId: product.id }));
    if (session.generation() !== generation) return false;
    if (started) toast.show(t('cart.added'), 'hint');
    return true;
  }

  const actions: ProductActions = {
    open: setSheet,
    add: (p) => {
      if (isCustomizable(p)) setSheet(p);
      else void add({ product: p, optionIds: [], removedIngredientIds: [], quantity: 1 }).catch((e: unknown) => toast.show(errorMessage(e), 'error'));
    },
    countOf,
  };
  return {
    cart: { count: cart?.count ?? 0, total: cart?.total ?? 0, add, countOf },
    actions, sheet, setSheet,
  };
}

import { type AddCartLine, type CartItem, isCustomizable, type Product, quantityOf } from '@tawsela/shared';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { ApiRequestError } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { session } from '@/core/auth/session';
import { cartApi, useCart } from '@/features/cart/api/cart';
import type { ProductActions } from '../components/ProductItems';

/**
 * What tapping a product does on a store page: the item opens the sheet; "+" adds a simple item at
 * once and opens the sheet for one with choices. [Open] Tapping the count badge adds one more.
 */
export function useProductTaps(storeId: number) {
  const { cart: snapshot, query, run } = useCart();
  const [sheet, setSheet] = useState<Product | null>(null);
  const [conflict, setConflict] = useState<{ item: AddCartLine; id: number; name: string } | null>(null);
  const cart = snapshot?.store.id === storeId ? snapshot : null;
  const countOf = (id: number) => (cart ? quantityOf(cart.lines, id) : 0);

  async function send(input: AddCartLine): Promise<boolean> {
    const generation = session.generation();
    try {
      await run(() => cartApi.add(input));
      return session.generation() === generation;
    } catch (e) {
      if (session.generation() !== generation) return false;
      if (e instanceof ApiRequestError && e.code === 'CART_STORE_CONFLICT') {
        const refreshed = await query.refetch();
        if (session.generation() !== generation) return false;
        if (refreshed.isError) throw refreshed.error;
        const latest = refreshed.data?.cart;
        if (latest && latest.store.id !== storeId) {
          setConflict({ item: input, id: latest.id, name: latest.store.name });
          return false;
        }
      }
      throw e;
    }
  }

  function add({ product, ...item }: CartItem<Product>) {
    return send({ ...item, productId: product.id });
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
    conflict: {
      storeName: conflict?.name,
      cancel: () => setConflict(null),
      replace: async () => {
        if (!conflict) return false;
        const added = await send({ ...conflict.item, replaceCartId: conflict.id });
        if (added) setConflict(null);
        return added;
      },
    },
  };
}

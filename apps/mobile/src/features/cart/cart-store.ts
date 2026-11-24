import { addToCart, type CartItem, type CartLine, cartSummary, type Product, quantityOf } from '@tawsela/shared';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * The cart while the customer shops in a store (contract §8.4 bottom bar, §8.5 "أضف للسلة").
 * [Open] Until the cart screen and the server cart arrive (Phase 9), lines live in the app's memory,
 * one list per store.
 */
type Lines = CartLine<Product>[];

const carts = new Map<number, Lines>();
const listeners = new Set<() => void>();
const NONE: Lines = [];

const notify = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const cartStore = {
  lines: (storeId: number): Lines => carts.get(storeId) ?? NONE,
  add(storeId: number, item: CartItem<Product>) {
    carts.set(storeId, addToCart(cartStore.lines(storeId), item));
    notify();
  },
  /** Empties every cart (tests start from nothing). */
  clear() {
    carts.clear();
    notify();
  },
};

/** One store's cart: its lines, totals, a product's count and how to add. */
export function useStoreCart(storeId: number) {
  const lines = useSyncExternalStore(subscribe, () => cartStore.lines(storeId));
  const add = useCallback((item: CartItem<Product>) => cartStore.add(storeId, item), [storeId]);
  const countOf = useCallback((productId: number) => quantityOf(lines, productId), [lines]);
  return { lines, ...cartSummary(lines), add, countOf };
}

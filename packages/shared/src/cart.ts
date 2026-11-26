import type { CatalogStore, Product } from './catalog.js';
import type { CartLine } from './product.js';

export const CART_MODES = ['delivery', 'pickup'] as const;
export type CartMode = (typeof CART_MODES)[number];
export const CART_NOTE_LIMIT = 200;
export const CART_QUANTITY_LIMIT = 99;

export interface CustomerCart {
  id: number;
  store: Pick<CatalogStore, 'id' | 'name' | 'isOpen' | 'pickupAllowed' | 'minimumOrder'>;
  lines: (CartLine<Product> & { id: number; available: boolean })[];
  note: string;
  mode: CartMode;
  count: number;
  total: number;
}

export interface CartResponse {
  cart: CustomerCart | null;
}

/**
 * A card on "سلاتي" (§8.6): one cart per store, newest first [Derived]. "<n> أصناف" counts the
 * cart's lines [Derived: the capture shows a one-line cart].
 */
export interface CartSummary {
  id: number;
  store: Pick<CatalogStore, 'id' | 'name' | 'logo'>;
  items: number;
}

/** GET and DELETE /v1/me/carts */
export interface CartsResponse {
  carts: CartSummary[];
}

export interface AddCartLine {
  productId: number;
  quantity: number;
  optionIds: number[];
  removedIngredientIds: number[];
}

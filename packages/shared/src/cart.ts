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

export interface AddCartLine {
  productId: number;
  quantity: number;
  optionIds: number[];
  removedIngredientIds: number[];
  replaceCartId?: number;
}

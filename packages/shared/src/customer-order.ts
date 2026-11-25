// The customer's side of a placed order (contract §8.8): its status, the details view and "اطلب تاني".
import type { CartMode, CustomerCart } from './cart.js';
import { type OrderStatus, orderStatusLabel } from './enums.js';
import type { Locale } from './format.js';
import type { CustomerOrder, OrderLine } from './order.js';

export type StepState = 'done' | 'current' | 'next';

export interface OrderStep {
  status: OrderStatus;
  state: StepState;
}

const DELIVERY_STEPS: OrderStatus[] = ['pending_review', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const PICKUP_STEPS: OrderStatus[] = ['pending_review', 'preparing', 'ready', 'delivered'];

/**
 * The order's way from review to delivered, and where it is now [Open: Tawsilty's active order screen
 * is not captured; live tracking is out of scope, §15.2]. A rejected or cancelled order has none.
 */
export function customerSteps(status: OrderStatus, mode: CartMode): OrderStep[] | null {
  const steps = mode === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  const at = steps.indexOf(status);
  if (at < 0) return null;
  return steps.map((s, i) => ({ status: s, state: i < at || status === 'delivered' ? 'done' : i === at ? 'current' : 'next' }));
}

/** The status as the customer reads it: a pickup is "ready to pick up" and then "picked up" [Derived]. */
export function customerStatusLabel(status: OrderStatus, mode: CartMode, locale: Locale = 'ar'): string {
  if (mode === 'pickup' && status === 'ready') return locale === 'ar' ? 'جاهز للاستلام' : 'Ready to pick up';
  if (mode === 'pickup' && status === 'delivered') return locale === 'ar' ? 'تم الاستلام' : 'Picked up';
  return orderStatusLabel(status, locale);
}

/** "اطلب تاني" is offered once the order is over [Derived]. */
export const canReorder = (status: OrderStatus) => status === 'delivered' || status === 'rejected' || status === 'cancelled';

/** GET /v1/me/orders/:id: "تفاصيل الطلب" (customer/orders/order-details-delivered-driver-fees-payment.jpg). */
export interface CustomerOrderDetails extends CustomerOrder {
  /** عنوان التوصيل; null for a pickup. */
  addressText: string | null;
  /** معلومات المندوب, once one takes it. */
  driver: { name: string } | null;
  lines: OrderLine[];
  /** طريقة الدفع: cash only for now (§15.1 #2). */
  paymentMethod: 'cash';
}

/** POST /v1/me/orders/:id/reorder */
export interface ReorderInput {
  /** The cart of another store the customer agreed to replace (409 CART_STORE_CONFLICT otherwise). */
  replaceCartId?: number;
}

export interface ReorderResult {
  cart: CustomerCart;
  /** Lines left out: gone from the menu, or their choices changed. */
  skipped: number;
}

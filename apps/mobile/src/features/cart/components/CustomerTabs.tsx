import { RoleTabs } from '@/core/navigation/RoleTabs';
import { useCarts } from '../api/cart';

/** The customer's tab bar: السلة shows how many stores they have a cart at (one cart per store). */
export function CustomerTabs() {
  const carts = useCarts();
  const count = carts.data?.carts.length ?? 0;
  return <RoleTabs role="customer" badges={count > 0 ? { cart: count } : undefined} />;
}

import { Gate } from '@/core/navigation/area-gate';
import { CartScreen } from '@/features/cart/screens/CartScreen';

/** One store's cart (contract §8.6), opened from "سلاتي", the store page's bar or "اطلب تاني". */
export default function StoreCart() {
  return (
    <Gate area="customer">
      <CartScreen />
    </Gate>
  );
}

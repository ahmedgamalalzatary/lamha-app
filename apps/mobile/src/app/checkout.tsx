import { Gate } from '@/core/navigation/area-gate';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';

/** "إتمام الدفع" (contract §8.7), opened from the cart's "تابع للدفع". */
export default function Checkout() {
  return (
    <Gate area="customer">
      <CheckoutScreen />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { CustomerOrderScreen } from '@/features/orders/CustomerOrderScreen';

/** "تفاصيل الطلب" (contract §8.8), opened from a card in طلباتي. */
export default function Order() {
  return (
    <Gate area="customer">
      <CustomerOrderScreen />
    </Gate>
  );
}

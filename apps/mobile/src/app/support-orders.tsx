import { Gate } from '@/core/navigation/area-gate';
import { PickOrderScreen } from '@/features/support/PickOrderScreen';

/** تقديم شكوى › طلب سابق (contract §8.14): pick the order. */
export default function Route() {
  return (
    <Gate area="customer">
      <PickOrderScreen />
    </Gate>
  );
}

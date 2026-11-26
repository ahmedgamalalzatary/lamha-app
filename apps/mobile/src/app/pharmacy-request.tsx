import { Gate } from '@/core/navigation/area-gate';
import { RequestScreen } from '@/features/pharmacy/screens/RequestScreen';

/** "الروشتة" (contract §8.11), opened from a pharmacy's "التالي" in "اختر صيدلية". */
export default function PharmacyRequest() {
  return (
    <Gate area="customer">
      <RequestScreen />
    </Gate>
  );
}

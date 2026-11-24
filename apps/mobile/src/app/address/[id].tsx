import { Gate } from '@/core/navigation/area-gate';
import { AddressFormScreen } from '@/features/addresses/screens/AddressFormScreen';

/** "تعديل العنوان" (contract §8.9), from the saved addresses sheet. */
export default function EditAddress() {
  return (
    <Gate area="customer">
      <AddressFormScreen />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { AddressFormScreen } from '@/features/addresses/screens/AddressFormScreen';

/** "عنوان جديد" (contract §8.9), after the map picker. */
export default function NewAddress() {
  return (
    <Gate area="customer">
      <AddressFormScreen />
    </Gate>
  );
}

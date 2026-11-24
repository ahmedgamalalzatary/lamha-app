import { Gate } from '@/core/navigation/area-gate';
import { MapPickerScreen } from '@/features/addresses/screens/MapPickerScreen';

/** The map picker (contract §8.9): a new address's spot, or a new spot for the address form (`?from=form`). */
export default function AddressMap() {
  return (
    <Gate area="customer">
      <MapPickerScreen />
    </Gate>
  );
}

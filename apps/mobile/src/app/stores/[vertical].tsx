import { Gate } from '@/core/navigation/area-gate';
import { StoresScreen } from '@/features/stores/screens/StoresScreen';

/** A store type's list, opened from a home tile (contract §8.3). */
export default function Stores() {
  return (
    <Gate area="customer">
      <StoresScreen />
    </Gate>
  );
}

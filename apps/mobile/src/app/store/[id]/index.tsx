import { Gate } from '@/core/navigation/area-gate';
import { StoreScreen } from '@/features/store/screens/StoreScreen';

/** A store's page (contract §8.4), opened from a store row, a search result or a pinned home tile. */
export default function Store() {
  return (
    <Gate area="customer">
      <StoreScreen />
    </Gate>
  );
}

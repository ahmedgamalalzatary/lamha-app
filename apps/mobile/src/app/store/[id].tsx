import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Gate } from '@/core/navigation/area-gate';

/** A store's page, opened from a pinned home tile. Phase 7 builds it (contract §8.4). */
export default function StoreScreen() {
  return (
    <Gate area="customer">
      <PlaceholderScreen title="tabs.home" back />
    </Gate>
  );
}

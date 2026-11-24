import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Gate } from '@/core/navigation/area-gate';

/** A vertical's store list, opened from a home tile. Phase 6 builds it (contract §8.3). */
export default function StoresScreen() {
  return (
    <Gate area="customer">
      <PlaceholderScreen title="tabs.home" back />
    </Gate>
  );
}

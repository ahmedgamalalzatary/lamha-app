import { Gate } from '@/core/navigation/area-gate';
import { RatingScreen } from '@/features/support/RatingScreen';

/** The rating screen (contract §8.8): from the popup when the app opens, or "قيّم طلبك" in the details. */
export default function Route() {
  return (
    <Gate area="customer">
      <RatingScreen />
    </Gate>
  );
}

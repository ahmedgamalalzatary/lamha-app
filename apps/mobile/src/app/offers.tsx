import { Gate } from '@/core/navigation/area-gate';
import { OffersScreen } from '@/features/offers/OffersScreen';

/** The offers screen (contract §8.10), from the home's العروض والكوبونات tiles (`?kind=`). */
export default function Offers() {
  return (
    <Gate area="customer">
      <OffersScreen />
    </Gate>
  );
}

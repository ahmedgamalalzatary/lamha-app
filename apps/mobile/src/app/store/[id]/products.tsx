import { Gate } from '@/core/navigation/area-gate';
import { StoreProductsScreen } from '@/features/store/screens/StoreProductsScreen';

/** A store's products as one grid (contract §8.2 mart banner), or only its discounted ones (`?offers=1`). */
export default function StoreProducts() {
  return (
    <Gate area="customer">
      <StoreProductsScreen />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { CategoryScreen } from '@/features/store/screens/CategoryScreen';

/** A store category's page (contract §8.4); `all` lists every product, from the store's search button. */
export default function StoreCategory() {
  return (
    <Gate area="customer">
      <CategoryScreen />
    </Gate>
  );
}

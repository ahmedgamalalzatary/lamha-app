import { Gate } from '@/core/navigation/area-gate';
import { FavoritesScreen } from '@/features/favorites/screens/FavoritesScreen';

/** المفضلة, from حسابي (contract §8.14). */
export default function Favorites() {
  return (
    <Gate area="customer">
      <FavoritesScreen />
    </Gate>
  );
}

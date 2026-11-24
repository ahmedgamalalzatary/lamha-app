import { Gate } from '@/core/navigation/area-gate';
import { SearchScreen } from '@/features/search/screens/SearchScreen';

/** Search, opened from the home search box (contract §8.13). */
export default function Search() {
  return (
    <Gate area="customer">
      <SearchScreen />
    </Gate>
  );
}

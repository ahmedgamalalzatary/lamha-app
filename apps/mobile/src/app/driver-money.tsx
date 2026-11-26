import { Gate } from '@/core/navigation/area-gate';
import { DriverMoneyScreen } from '@/features/driver/screens/DriverMoneyScreen';

/** فواتيري: his net earnings and الخصومات والغرامات (§10). */
export default function Screen() {
  return (
    <Gate area="driver">
      <DriverMoneyScreen />
    </Gate>
  );
}

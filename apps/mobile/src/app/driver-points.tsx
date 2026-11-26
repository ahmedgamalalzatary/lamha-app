import { Gate } from '@/core/navigation/area-gate';
import { DriverPointsScreen } from '@/features/driver/screens/DriverPointsScreen';

/** The delivery man's نقاطي: speed points (§10). */
export default function Screen() {
  return (
    <Gate area="driver">
      <DriverPointsScreen />
    </Gate>
  );
}

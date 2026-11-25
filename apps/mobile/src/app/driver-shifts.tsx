import { Gate } from '@/core/navigation/area-gate';
import { DriverShiftsScreen } from '@/features/driver/DriverShiftsScreen';

export default function Screen() {
  return (
    <Gate area="driver">
      <DriverShiftsScreen />
    </Gate>
  );
}

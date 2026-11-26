import { Gate } from '@/core/navigation/area-gate';
import { DriverOrderScreen } from '@/features/driver/screens/DriverOrderScreen';

export default function Screen() {
  return (
    <Gate area="driver">
      <DriverOrderScreen />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { DriverHistoryScreen } from '@/features/driver/DriverHistoryScreen';

/** سجل الطلبات (contract §10): طلباتى. */
export default function Screen() {
  return (
    <Gate area="driver">
      <DriverHistoryScreen />
    </Gate>
  );
}

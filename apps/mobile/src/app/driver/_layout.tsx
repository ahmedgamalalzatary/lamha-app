import { Gate } from '@/core/navigation/area-gate';
import { RoleTabs } from '@/core/navigation/RoleTabs';
import { DriverLive } from '@/features/driver/DriverLive';

export default function Layout() {
  return (
    <Gate area="driver">
      <RoleTabs role="driver" />
      <DriverLive />
    </Gate>
  );
}

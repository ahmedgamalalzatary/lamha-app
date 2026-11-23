import { Gate } from '@/core/navigation/area-gate';
import { RoleTabs } from '@/core/navigation/RoleTabs';

export default function Layout() {
  return (
    <Gate area="partner">
      <RoleTabs role="partner" />
    </Gate>
  );
}

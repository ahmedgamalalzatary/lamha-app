import { Gate } from '@/core/navigation/area-gate';
import { RoleTabs } from '@/core/navigation/RoleTabs';
import { PartnerLive } from '@/features/partner/components/PartnerLive';

export default function Layout() {
  return (
    <Gate area="partner">
      <RoleTabs role="partner" />
      <PartnerLive />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { RoleTabs } from '@/core/navigation/RoleTabs';
import { CustomerLive } from '@/features/orders/components/CustomerLive';
import { RatePrompt } from '@/features/support/components/RatePrompt';

export default function Layout() {
  return (
    <Gate area="customer">
      <RoleTabs role="customer" />
      <CustomerLive />
      <RatePrompt />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { RoleTabs } from '@/core/navigation/RoleTabs';
import { CustomerLive } from '@/features/orders/CustomerLive';
import { RatePrompt } from '@/features/support/RatePrompt';

export default function Layout() {
  return (
    <Gate area="customer">
      <RoleTabs role="customer" />
      <CustomerLive />
      <RatePrompt />
    </Gate>
  );
}

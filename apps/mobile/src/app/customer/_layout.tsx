import { Gate } from '@/core/navigation/area-gate';
import { CustomerTabs } from '@/features/cart/components/CustomerTabs';
import { CustomerLive } from '@/features/orders/components/CustomerLive';
import { RatePrompt } from '@/features/support/components/RatePrompt';

export default function Layout() {
  return (
    <Gate area="customer">
      <CustomerTabs />
      <CustomerLive />
      <RatePrompt />
    </Gate>
  );
}

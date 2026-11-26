import { Gate } from '@/core/navigation/area-gate';
import { PartnerOrderScreen } from '@/features/partner/screens/PartnerOrderScreen';

/** The store's order details (contract §9), opened from a card's "التفاصيل". */
export default function PartnerOrder() {
  return (
    <Gate area="partner">
      <PartnerOrderScreen />
    </Gate>
  );
}

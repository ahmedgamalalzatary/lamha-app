import { Gate } from '@/core/navigation/area-gate';
import { TicketScreen } from '@/features/support/screens/TicketScreen';

/** تقديم شكوى / تقديم اقتراح (contract §8.14); a complaint may name a past order. */
export default function Route() {
  return (
    <Gate area="customer">
      <TicketScreen />
    </Gate>
  );
}

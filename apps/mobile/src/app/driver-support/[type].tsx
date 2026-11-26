import { Gate } from '@/core/navigation/area-gate';
import { TicketScreen } from '@/features/support/screens/TicketScreen';

/** The delivery man's تقديم شكوى / تقديم مقترح (§10): general, or about one of his orders from طلباتى. */
export default function Route() {
  return (
    <Gate area="driver">
      <TicketScreen />
    </Gate>
  );
}

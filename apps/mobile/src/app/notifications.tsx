import { Gate } from '@/core/navigation/area-gate';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';

/** الإشعارات (contract §8.14), from the bell on حسابي, for every signed-in account. */
export default function Route() {
  return (
    <Gate area="account">
      <NotificationsScreen />
    </Gate>
  );
}

import { Gate } from '@/core/navigation/area-gate';
import { NotificationSettingsScreen } from '@/features/notifications/screens/NotificationSettingsScreen';

/** إعدادات الإشعارات (contract §8.14): "تفعيل الإشعار". */
export default function Route() {
  return (
    <Gate area="account">
      <NotificationSettingsScreen />
    </Gate>
  );
}

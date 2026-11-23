import { ProfileScreen } from '@/features/account/screens/ProfileScreen';
import { Gate } from '@/core/navigation/area-gate';

export default function Profile() {
  return (
    <Gate area="account">
      <ProfileScreen />
    </Gate>
  );
}

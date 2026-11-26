import { Gate } from '@/core/navigation/area-gate';
import { InviteScreen } from '@/features/invite/screens/InviteScreen';

/** ادعُ أصدقاءك (contract §8.17), from حسابي's and الرئيسية's invite cards. */
export default function Route() {
  return (
    <Gate area="customer">
      <InviteScreen />
    </Gate>
  );
}

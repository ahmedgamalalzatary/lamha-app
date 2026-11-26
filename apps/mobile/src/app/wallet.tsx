import { Gate } from '@/core/navigation/area-gate';
import { WalletScreen } from '@/features/wallet/WalletScreen';

/** حركة المحفظة (contract §8.15), from محفظتي on حسابي. */
export default function Route() {
  return (
    <Gate area="customer">
      <WalletScreen />
    </Gate>
  );
}

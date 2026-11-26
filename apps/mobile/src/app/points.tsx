import { Gate } from '@/core/navigation/area-gate';
import { PointsScreen } from '@/features/points/screens/PointsScreen';

/** نقاطي (contract §8.16), from حسابي and الرئيسية's "استخدم ووفر". */
export default function Route() {
  return (
    <Gate area="customer">
      <PointsScreen />
    </Gate>
  );
}

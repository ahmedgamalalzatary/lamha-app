import { Stack } from 'expo-router';
import { Gate } from '@/core/navigation/area-gate';
import { colors } from '@/core/theme';

/** Sign-in, sign-up and password reset: only for a signed-out visitor. */
export default function AuthLayout() {
  return (
    <Gate area="auth">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </Gate>
  );
}

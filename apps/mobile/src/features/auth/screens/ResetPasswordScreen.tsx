import { isValidPassword } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { authApi, homeOf } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/** The new password after the emailed code; it signs the customer in. Drawn in Tawsilty's sign-up pattern [Open]. */
export function ResetPasswordScreen() {
  const t = useT();
  const { ticket } = useLocalSearchParams<{ ticket: string }>();
  const [password, setPassword] = useState('');
  const [checked, setChecked] = useState(false);
  const bad = checked && !isValidPassword(password);

  const { run, busy } = useSubmit(async () => {
    const res = await authApi.resetPassword(ticket, password);
    await session.signIn(res);
    router.replace(homeOf(res.user.role));
  });

  const submit = () => {
    setChecked(true);
    if (isValidPassword(password)) void run();
  };

  return (
    <AuthLayout
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      footer={<Button label={t('common.save')} disabled={!password} loading={busy} onPress={submit} />}
    >
      <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secure autoComplete="new-password" />
      <View style={[styles.hint, bad && styles.hintBad]}>
        <ShieldCheck size={18} color={bad ? colors.danger : colors.primary} />
        <AppText size={14} color={bad ? colors.danger : colors.ink2}>
          {t('auth.passwordHint')}
        </AppText>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E9EAEE',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: -spacing.sm,
  },
  hintBad: { borderColor: colors.danger },
});

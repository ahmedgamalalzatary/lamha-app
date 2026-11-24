import { router, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { authApi, homeOf } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';
import { LockedPhone } from '../components/PhoneField';

/** Tawsilty's "أهلاً بعودتك" (contract §8.1 step 4): the password for a phone that has an account, any role. */
export function SignInScreen() {
  const t = useT();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [password, setPassword] = useState('');

  const { run, busy } = useSubmit(async () => {
    const res = await authApi.login(phone, password);
    await session.signIn(res);
    router.replace(homeOf(res.user.role));
  });

  return (
    <AuthLayout back="grey" icon={Lock} title={t('auth.signIn.title')} subtitle={t('auth.signIn.subtitle')}>
      <LockedPhone phone={phone} />
      <TextField
        label={t('auth.password')}
        labelAbove
        icon={Lock}
        placeholder={t('auth.signIn.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secure
        autoFocus
        autoComplete="current-password"
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push({ pathname: '/forgot-password', params: { phone } })}
        style={styles.forgot}
      >
        <AppText weight="semibold" color={colors.primary}>
          {t('auth.signIn.forgot')}
        </AppText>
      </Pressable>
      <Button label={t('auth.signIn.submit')} disabled={!password} loading={busy} onPress={() => void run()} style={styles.submit} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-start', marginTop: -spacing.sm },
  submit: { marginTop: spacing.lg, minHeight: 58 },
});

import { isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { authApi, homeOf } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Sign-in with phone + password, for every role (contract §2, §8.1 step 4). Not captured from
 * Tawsilty yet: drawn in the pattern of its "رمز التحقق" and "التفاصيل الشخصية" screens [Open].
 */
export function SignInScreen() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const { run, busy } = useSubmit(async () => {
    const res = await authApi.login(normalizePhone(phone), password);
    await session.signIn(res);
    router.replace(homeOf(res.user.role));
  });

  const submit = () => {
    if (!isEgyptianMobile(phone)) return setPhoneError(t('auth.badPhone'));
    setPhoneError(null);
    void run();
  };

  return (
    <AuthLayout
      back={false}
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      footer={
        <View style={styles.footer}>
          <Button label={t('auth.signIn.submit')} disabled={!phone || !password} loading={busy} onPress={submit} />
          <View style={styles.signUp}>
            <AppText color={colors.ink2}>{t('auth.signIn.noAccount')}</AppText>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/sign-up')}>
              <AppText weight="bold" color={colors.primary}>
                {t('auth.signIn.create')}
              </AppText>
            </Pressable>
          </View>
        </View>
      }
    >
      <TextField
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={phoneError}
      />
      <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secure autoComplete="current-password" />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/forgot-password')} style={styles.forgot}>
        <AppText weight="semibold" color={colors.primary} style={styles.underline}>
          {t('auth.signIn.forgot')}
        </AppText>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.lg },
  signUp: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  forgot: { alignSelf: 'flex-start', marginTop: -spacing.sm },
  underline: { textDecorationLine: 'underline' },
});

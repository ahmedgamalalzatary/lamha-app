import { isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';
import { PhoneField } from '../components/PhoneField';

/**
 * Tawsilty's "إسترجاع بيانات الدخول" (contract §8.1): the code goes to the account's email, not by
 * SMS. Partners and drivers are told to ask the admin. The phone from the sign-in step is filled in.
 */
export function ForgotPasswordScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState(params.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const { run, busy } = useSubmit(async (p: string) => {
    const sent = await authApi.sendResetCode(p);
    router.push({ pathname: '/verify', params: { purpose: 'reset', phone: p, email: sent.email } });
  });

  const submit = () => {
    if (!isEgyptianMobile(phone)) return setError(t('auth.badPhone'));
    setError(null);
    void run(normalizePhone(phone));
  };

  return (
    <AuthLayout
      back="grey"
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <View style={styles.footer}>
          <Button label={t('auth.forgot.submit')} disabled={!phone} loading={busy} onPress={submit} />
          <View style={styles.remembered}>
            <AppText color={colors.ink2}>{t('auth.forgot.remembered')}</AppText>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
              <AppText weight="bold" color={colors.primary}>
                {t('auth.forgot.signIn')}
              </AppText>
            </Pressable>
          </View>
        </View>
      }
    >
      <PhoneField value={phone} onChangeText={setPhone} error={error} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.lg },
  remembered: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
});

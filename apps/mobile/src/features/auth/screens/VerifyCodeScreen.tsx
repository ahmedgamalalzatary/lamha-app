import { OTP, type OtpPurpose } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { OtpInput } from '@/components/OtpInput';
import { toast } from '@/components/Toast';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Tawsilty's "رمز التحقق" (customer/auth/otp-4-digits-resend-timer.jpeg), with the code sent to the
 * email instead of an SMS (contract §8.1): 4 boxes, a 00:59 resend countdown, "تأكيد" once 4 digits are in.
 */
export function VerifyCodeScreen() {
  const t = useT();
  const { purpose, phone, email } = useLocalSearchParams<{ purpose: OtpPurpose; phone: string; email: string }>();
  const [code, setCode] = useState('');
  // Counted from a deadline, so the countdown stays right after the app was in the background.
  const [until, setUntil] = useState(() => Date.now() + OTP.resendSeconds * 1000);
  const [wait, setWait] = useState<number>(OTP.resendSeconds);

  useEffect(() => {
    const tick = () => setWait(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);

  const verify = useSubmit(async () => {
    const { ticket } = await authApi.verifyCode(phone, purpose, code);
    if (purpose === 'signup') router.replace({ pathname: '/sign-up/details', params: { ticket, phone, email } });
    else router.replace({ pathname: '/reset-password', params: { ticket } });
  });

  const resend = useSubmit(async () => {
    const sent = purpose === 'signup' ? await authApi.sendSignupCode(phone, email) : await authApi.sendResetCode(phone);
    setCode('');
    setUntil(Date.now() + sent.resendIn * 1000);
    toast.show(t('auth.verify.resent'), 'success');
  });

  return (
    <AuthLayout
      title={t('auth.verify.title')}
      subtitle={
        <View style={styles.sub}>
          <View style={styles.sentTo}>
            <AppText size={15} color={colors.ink2}>
              {t('auth.verify.sentTo')}
            </AppText>
            <AppText weight="bold" size={15}>
              {email}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.change}>
            <AppText weight="bold" color={colors.primary} style={styles.underline}>
              {t('auth.verify.change')}
            </AppText>
          </Pressable>
        </View>
      }
      footer={
        <Button label={t('auth.verify.submit')} disabled={code.length < OTP.length} loading={verify.busy} onPress={() => verify.run()} />
      }
    >
      <OtpInput value={code} onChange={setCode} label={t('auth.verify.code')} />
      <View style={styles.resend}>
        {wait > 0 ? (
          <>
            <AppText color={colors.ink2}>{t('auth.verify.resendIn')}</AppText>
            <AppText weight="bold" color={colors.primary}>
              {mmss(wait)}
            </AppText>
          </>
        ) : (
          <Pressable accessibilityRole="button" disabled={resend.busy} hitSlop={8} onPress={() => resend.run()}>
            <AppText weight="bold" color={colors.primary} style={styles.underline}>
              {t('auth.verify.resend')}
            </AppText>
          </Pressable>
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: spacing.lg, gap: spacing.xl },
  sentTo: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  change: { alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  resend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl },
});

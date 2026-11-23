import { isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/**
 * "نسيت كلمة المرور؟": the code goes to the account's email (contract §8.1). Partners and drivers
 * are told to ask the admin. Not captured from Tawsilty yet: drawn in its sign-up pattern [Open].
 */
export function ForgotPasswordScreen() {
  const t = useT();
  const [phone, setPhone] = useState('');
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
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={<Button label={t('auth.forgot.submit')} disabled={!phone} loading={busy} onPress={submit} />}
    >
      <TextField label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={error} />
    </AuthLayout>
  );
}

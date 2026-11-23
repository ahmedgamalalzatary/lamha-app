import { isEgyptianMobile, isValidEmail, normalizeEmail, normalizePhone } from '@tawsela/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Sign-up step 1: phone and email; the code goes to the email (contract §8.1). Not captured from
 * Tawsilty yet: drawn in the pattern of its sign-up screens [Open].
 */
export function SignUpScreen() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});

  const { run, busy } = useSubmit(async (p: string, e: string) => {
    const sent = await authApi.sendSignupCode(p, e);
    router.push({ pathname: '/verify', params: { purpose: 'signup', phone: p, email: sent.email } });
  });

  const submit = () => {
    const next = {
      phone: isEgyptianMobile(phone) ? undefined : t('auth.badPhone'),
      email: isValidEmail(email) ? undefined : t('auth.badEmail'),
    };
    setErrors(next);
    if (!next.phone && !next.email) void run(normalizePhone(phone), normalizeEmail(email));
  };

  return (
    <AuthLayout
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={<Button label={t('common.continue')} disabled={!phone || !email} loading={busy} onPress={submit} />}
    >
      <TextField label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />
    </AuthLayout>
  );
}

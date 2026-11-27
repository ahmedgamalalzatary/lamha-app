import { isValidEmail, normalizeEmail } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { LockedField } from '@/components/LockedField';
import { TextField } from '@/components/TextField';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';

/**
 * A new phone from the phone step. Tawsilty texts its code here; Tawsela emails it (contract §8.1,
 * no SMS), so this step asks for the email. Not captured: drawn in the phone step's look [Open].
 */
export function SignUpScreen() {
  const t = useT();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { run, busy } = useSubmit(async (e: string) => {
    const sent = await authApi.sendSignupCode(phone, e);
    router.push({ pathname: '/verify', params: { purpose: 'signup', phone, email: sent.email } });
  });

  const submit = () => {
    if (!isValidEmail(email)) return setError(t('auth.badEmail'));
    setError(null);
    void run(normalizeEmail(email));
  };

  return (
    <AuthLayout
     
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={<Button label={t('common.continue')} disabled={!email} loading={busy} onPress={submit} />}
    >
      <LockedField icon={Phone} label={t('auth.phone')} value={phone} />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoFocus
        clearable
        error={error}
      />
    </AuthLayout>
  );
}

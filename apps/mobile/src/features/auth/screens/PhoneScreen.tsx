import { isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { authApi } from '../api/auth';
import { AuthLayout } from '../components/AuthLayout';
import { PhoneField } from '../components/PhoneField';

/**
 * Tawsilty's phone step (contract §8.1): a phone with an account goes on to its password; a new one
 * goes on to sign-up, which asks for the email because the code is emailed, never texted.
 */
export function PhoneScreen() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { run, busy } = useSubmit(async (p: string) => {
    const { registered } = await authApi.checkPhone(p);
    router.push({ pathname: registered ? '/sign-in/password' : '/sign-up', params: { phone: p } });
  });

  const submit = () => {
    if (!isEgyptianMobile(phone)) return setError(t('auth.badPhone'));
    setError(null);
    void run(normalizePhone(phone));
  };

  return (
    <AuthLayout
      back="grey"
      title={t('auth.phone')}
      subtitle={t('auth.phoneStep.note')}
      footer={<Button label={t('common.continue')} disabled={!phone} loading={busy} onPress={submit} />}
    >
      <PhoneField value={phone} onChangeText={setPhone} error={error} />
    </AuthLayout>
  );
}

'use client';

import { isEgyptianMobile, normalizePhone } from '@tawsela/shared';
import { type FormEvent, useState } from 'react';
import Image from 'next/image';
import { api } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, TextField } from '@/components/ui';
import { AreaGate } from './AreaGate';

/**
 * `/sign-in`: one page for admins and partners (contract §2, W1); the role picks the area after.
 * Tawsilty's admin sign-in is not captured [Open]: this follows the app's sign-in words and look.
 */
export function SignInRoute() {
  return (
    <AreaGate area="sign-in">
      <SignInPage />
    </AreaGate>
  );
}

function SignInPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ready = isEgyptianMobile(normalizePhone(phone)) && password.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(undefined);
    try {
      // On success the session changes and the gate opens the account's area.
      await api.signIn(normalizePhone(phone), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen w-full place-items-center bg-tw-surface p-4">
      <form onSubmit={submit} noValidate className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo-ar.png" alt="وصّل" width={150} height={60} priority />
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-tw-ink-2">أدخل رقم هاتفك وكلمة المرور</p>
        </div>
        <TextField label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="username" dir="ltr" placeholder="01xxxxxxxxx" />
        <TextField label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" />
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <Button type="submit" disabled={!ready} loading={busy} className="w-full">
          تسجيل الدخول
        </Button>
      </form>
    </main>
  );
}

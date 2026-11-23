'use client';

import { useQuery } from '@tanstack/react-query';
import type { Me } from '@tawsela/shared';
import { LogOut } from 'lucide-react';
import { api } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button } from '@/components/ui';

/** `/partner/account` (contract §11.1 الحساب): the profile and sign-out. The store's own page is المتجر. */
export function PartnerAccountPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.request<Me>('/me') });
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">الحساب</h1>
      {me.isPending ? (
        <div className="h-28 animate-pulse rounded-xl bg-tw-surface" />
      ) : me.isError ? (
        <p className="font-medium text-tw-danger">{errorMessage(me.error)}</p>
      ) : (
        <dl className="flex flex-col divide-y divide-tw-line rounded-xl border border-tw-line text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-tw-ink-2">الاسم</dt>
            <dd className="font-semibold">{`${me.data.firstName} ${me.data.lastName}`.trim()}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-tw-ink-2">رقم الهاتف</dt>
            <dd className="font-semibold" dir="ltr">
              {me.data.phone}
            </dd>
          </div>
        </dl>
      )}
      <p className="text-sm text-tw-ink-2">لتغيير كلمة المرور تواصل مع الإدارة.</p>
      <Button tone="danger" className="self-start" onClick={() => void api.signOut()}>
        <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
        تسجيل الخروج
      </Button>
    </div>
  );
}

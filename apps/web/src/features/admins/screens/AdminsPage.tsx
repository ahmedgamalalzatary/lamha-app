'use client';

import { isEgyptianMobile, normalizePhone, type StaffAccount } from '@tawsela/shared';
import { Ban, CircleCheck, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { PasswordShown } from '@/components/PasswordShown';
import { Button, ConfirmDialog, Dialog, ErrorLine, IconButton, TextField } from '@/components/ui';
import { useAdmins, useCreateAdmin, useResetAdminPassword, useSetAdminDisabled } from '../api/admins';

const fullName = (a: StaffAccount) => `${a.firstName} ${a.lastName}`.trim();

type Pending = { kind: 'reset' | 'disable' | 'enable'; account: StaffAccount };

/**
 * الإعدادات › حسابات الإدارة (contract §1.1 A23). The table follows Tawsilty's admin orders table:
 * an orange header row and the actions in العمليات. A new or reset password is shown once (§2).
 */
export function AdminsPage() {
  const admins = useAdmins();
  const reset = useResetAdminPassword();
  const setDisabled = useSetAdminDisabled();
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();

  const confirm = async () => {
    if (!pending) return;
    setActionError(undefined);
    try {
      if (pending.kind === 'reset') setPassword((await reset.mutateAsync(pending.account.id)).password);
      else await setDisabled.mutateAsync({ id: pending.account.id, disabled: pending.kind === 'disable' });
    } catch (e) {
      setActionError(errorMessage(e));
    }
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">حسابات الإدارة</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          إضافة
        </Button>
      </div>
      {actionError ? <ErrorLine>{actionError}</ErrorLine> : null}

      {admins.isPending ? (
        <div className="h-48 animate-pulse rounded-xl bg-tw-surface" />
      ) : admins.isError ? (
        <div className="flex items-center gap-4">
          <p className="font-medium text-tw-danger">{errorMessage(admins.error)}</p>
          <Button tone="soft" onClick={() => void admins.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-tw-line">
          <table className="w-full text-start text-sm">
            <thead className="bg-tw text-white">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">الاسم</th>
                <th className="px-4 py-3 text-start font-semibold">رقم الهاتف</th>
                <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                <th className="px-4 py-3 text-start font-semibold">العمليات</th>
              </tr>
            </thead>
            <tbody>
              {admins.data.map((a) => (
                <tr key={a.id} className="border-t border-tw-line">
                  <td className="px-4 py-3 font-semibold">{a.you ? `${fullName(a)} (أنت)` : fullName(a)}</td>
                  <td className="px-4 py-3" dir="ltr">
                    <span className="block text-end">{a.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${a.disabled ? 'bg-tw-danger/10 text-tw-danger' : 'bg-tw-ok-50 text-tw-ok'}`}
                    >
                      {a.disabled ? 'موقوف' : 'نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {a.you ? null : (
                      <div className="flex items-center gap-1">
                        <IconButton label="إعادة تعيين كلمة المرور" onClick={() => setPending({ kind: 'reset', account: a })}>
                          <KeyRound className="size-4" aria-hidden />
                        </IconButton>
                        {a.disabled ? (
                          <IconButton label="تفعيل الحساب" onClick={() => setPending({ kind: 'enable', account: a })}>
                            <CircleCheck className="size-4" aria-hidden />
                          </IconButton>
                        ) : (
                          <IconButton label="إيقاف الحساب" onClick={() => setPending({ kind: 'disable', account: a })}>
                            <Ban className="size-4" aria-hidden />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <AddAdmin
          onClose={() => setAdding(false)}
          onCreated={(p) => {
            setAdding(false);
            setPassword(p);
          }}
        />
      ) : null}
      {pending ? (
        <ConfirmDialog
          title={TITLES[pending.kind]}
          message={MESSAGES[pending.kind](fullName(pending.account))}
          busy={reset.isPending || setDisabled.isPending}
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        />
      ) : null}
      {password ? <PasswordShown password={password} onClose={() => setPassword(null)} /> : null}
    </div>
  );
}

const TITLES = { reset: 'إعادة تعيين كلمة المرور', disable: 'إيقاف الحساب', enable: 'تفعيل الحساب' } as const;
const MESSAGES = {
  reset: (name: string) => `ستُنشأ كلمة مرور جديدة لـ ${name}، وتتوقف القديمة ويُسجَّل خروجه من كل الأجهزة.`,
  disable: (name: string) => `لن يستطيع ${name} الدخول، ويُسجَّل خروجه فوراً.`,
  enable: (name: string) => `سيستطيع ${name} الدخول مرة أخرى بكلمة مروره.`,
};

function AddAdmin({ onClose, onCreated }: { onClose: () => void; onCreated: (password: string) => void }) {
  const create = useCreateAdmin();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const ready = firstName.trim() !== '' && isEgyptianMobile(normalizePhone(phone));
  const save = () =>
    create.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizePhone(phone) },
      { onSuccess: (res) => onCreated(res.password) },
    );
  return (
    <Dialog title="إضافة مسؤول" onClose={onClose}>
      <TextField label="الاسم الأول" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
      <TextField label="اسم العائلة" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <TextField label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" />
      <p className="text-xs text-tw-ink-2">تُنشأ كلمة المرور تلقائياً وتظهر مرة واحدة بعد الحفظ.</p>
      {create.isError ? <ErrorLine>{errorMessage(create.error)}</ErrorLine> : null}
      <div className="flex items-center gap-3">
        <Button disabled={!ready} loading={create.isPending} onClick={save} className="flex-1">
          حفظ
        </Button>
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-full text-sm font-semibold text-tw-ink-2">
          إلغاء
        </button>
      </div>
    </Dialog>
  );
}

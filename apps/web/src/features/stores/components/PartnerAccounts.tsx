'use client';

import { isEgyptianMobile, normalizePhone, type PartnerAccount } from '@tawsela/shared';
import { Ban, CircleCheck, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { PasswordShown } from '@/components/PasswordShown';
import { Button, ConfirmDialog, Dialog, ErrorLine, IconButton, LoadState, Pill, Table, TextField } from '@/components/ui';
import { useCreatePartner, useResetPartnerPassword, useSetPartnerDisabled, useStorePartners } from '../../catalog/api/catalog';

const fullName = (a: PartnerAccount) => `${a.firstName} ${a.lastName}`.trim();

type Pending = { kind: 'reset' | 'disable' | 'enable'; account: PartnerAccount };

const TITLES = { reset: 'إعادة تعيين كلمة المرور', disable: 'إيقاف الحساب', enable: 'تفعيل الحساب' } as const;
const MESSAGES = {
  reset: (name: string) => `ستُنشأ كلمة مرور جديدة لـ ${name}، وتتوقف القديمة ويُسجَّل خروجه من كل الأجهزة.`,
  disable: (name: string) => `لن يستطيع ${name} الدخول، ويُسجَّل خروجه فوراً.`,
  enable: (name: string) => `سيستطيع ${name} الدخول مرة أخرى بكلمة مروره.`,
};

/** The store's partner accounts (contract §2): add one, reset a password (shown once), disable or enable. */
export function PartnerAccounts({ storeId }: { storeId: number }) {
  const partners = useStorePartners(storeId);
  const reset = useResetPartnerPassword();
  const setDisabled = useSetPartnerDisabled();
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
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">حسابات المورد</h2>
        <Button tone="soft" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          إضافة حساب
        </Button>
      </div>
      {actionError ? <ErrorLine>{actionError}</ErrorLine> : null}
      {partners.isPending || partners.isError ? (
        <LoadState error={partners.isError ? errorMessage(partners.error) : undefined} onRetry={() => void partners.refetch()} />
      ) : (
        <Table headers={['الاسم', 'رقم الهاتف', 'الحالة', 'العمليات']}>
          {partners.data.map((a) => (
            <tr key={a.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{fullName(a)}</td>
              <td className="px-4 py-3" dir="ltr">
                <span className="block text-end">{a.phone}</span>
              </td>
              <td className="px-4 py-3">
                <Pill tone={a.disabled ? 'danger' : 'ok'}>{a.disabled ? 'موقوف' : 'نشط'}</Pill>
              </td>
              <td className="px-4 py-2">
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
              </td>
            </tr>
          ))}
        </Table>
      )}

      {adding ? (
        <AddPartner
          storeId={storeId}
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
    </section>
  );
}

function AddPartner({ storeId, onClose, onCreated }: { storeId: number; onClose: () => void; onCreated: (password: string) => void }) {
  const create = useCreatePartner();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const ready = firstName.trim() !== '' && isEgyptianMobile(normalizePhone(phone));
  const save = () =>
    create.mutate(
      { storeId, firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizePhone(phone) },
      { onSuccess: (res) => onCreated(res.password) },
    );
  return (
    <Dialog title="إضافة حساب مورد" onClose={onClose}>
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

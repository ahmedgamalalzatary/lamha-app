'use client';

import { type DriverAccount, isEgyptianMobile, normalizePhone, WEEK_DAYS, type WeekSchedule } from '@tawsela/shared';
import { Ban, Bike, CalendarClock, CircleCheck, KeyRound, Play, Plus, ReceiptText, Wallet } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { PasswordShown } from '@/components/PasswordShown';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, Pill, Switch, Table, TextField } from '@/components/ui';
import { useCreateDriver, useDrivers, useDriverSettings, useResetDriverPassword, useSetDriverDisabled, useSetDriverSchedule, useStartDriverShift } from '../api/drivers';
import { DriverFeeDialog, DriverMoneyDialog } from '../components/DriverMoneyDialogs';
import { isWeekReady, WeekEditor } from '../components/WeekEditor';

const fullName = (a: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`.trim();

const CAIRO_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** "10:45" in Cairo time, Latin digits (contract §7). */
export const cairoTime = (iso: string) => CAIRO_TIME.format(new Date(iso));

type Pending = { kind: 'reset' | 'disable' | 'enable' | 'start'; account: DriverAccount };

/** Where he stands now: blocked for skipping, working, or not. */
export function ShiftPill({ driver }: { driver: Pick<DriverAccount, 'onShift' | 'blockedUntil'> }) {
  if (driver.blockedUntil) return <Pill tone="danger">موقوف حتى {cairoTime(driver.blockedUntil)}</Pill>;
  return driver.onShift ? <Pill tone="ok">في الشفت</Pill> : <Pill tone="muted">خارج الشفت</Pill>;
}

/**
 * المندوبين (contract §11, §10): the delivery men's accounts in the orders-table look, their shift now,
 * whose week and fee they follow, and each one's الحساب (earnings, fines, speed points). "إضافة" makes an account and shows the password once (§2). [Open]
 * Tawsilty's page is not captured.
 */
export function DriversPage() {
  const [query, setQuery] = useState('');
  const drivers = useDrivers(query);
  const reset = useResetDriverPassword();
  const setDisabled = useSetDriverDisabled();
  const start = useStartDriverShift();
  const [adding, setAdding] = useState(false);
  const [scheduling, setScheduling] = useState<DriverAccount | null>(null);
  const [money, setMoney] = useState<DriverAccount | null>(null);
  const [fees, setFees] = useState<DriverAccount | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();

  const confirm = async () => {
    if (!pending) return;
    setActionError(undefined);
    try {
      const { kind, account } = pending;
      if (kind === 'reset') setPassword((await reset.mutateAsync(account.id)).password);
      else if (kind === 'start') await start.mutateAsync(account.id);
      else await setDisabled.mutateAsync({ id: account.id, disabled: kind === 'disable' });
    } catch (e) {
      setActionError(errorMessage(e));
    }
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">المندوبين</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          إضافة
        </Button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم أو رقم الهاتف"
        aria-label="ابحث بالاسم أو رقم الهاتف"
        className="h-11 max-w-sm rounded-xl bg-tw-input px-4 text-sm outline-none focus:ring-2 focus:ring-tw/40"
      />
      {actionError ? <ErrorLine>{actionError}</ErrorLine> : null}

      {drivers.isPending || drivers.isError ? (
        <LoadState error={drivers.isError ? errorMessage(drivers.error) : undefined} onRetry={() => void drivers.refetch()} />
      ) : drivers.data.length === 0 ? (
        <EmptyState icon={Bike} title="لا يوجد مندوبين" />
      ) : (
        <Table headers={['الاسم', 'رقم الهاتف', 'الحساب', 'الشفت', 'النوبات', 'الرسوم', 'العمليات']}>
          {drivers.data.map((d) => (
            <tr key={d.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{fullName(d)}</td>
              <td className="px-4 py-3" dir="ltr">
                <span className="block text-end">{d.phone}</span>
              </td>
              <td className="px-4 py-3">{d.disabled ? <Pill tone="danger">موقوف</Pill> : <Pill tone="ok">نشط</Pill>}</td>
              <td className="px-4 py-3">
                <ShiftPill driver={d} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{d.schedule ? 'جدول خاص' : 'الجدول العام'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{d.fee ? 'رسوم خاصة' : 'رسوم العميل'}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <IconButton label={`نوبات ${fullName(d)}`} onClick={() => setScheduling(d)}>
                    <CalendarClock className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`حساب ${fullName(d)}`} onClick={() => setMoney(d)}>
                    <Wallet className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`رسوم ${fullName(d)}`} onClick={() => setFees(d)}>
                    <ReceiptText className="size-4" aria-hidden />
                  </IconButton>
                  {!d.onShift && !d.disabled ? (
                    <IconButton label={`بدء الشفت لـ ${fullName(d)}`} onClick={() => setPending({ kind: 'start', account: d })}>
                      <Play className="size-4" aria-hidden />
                    </IconButton>
                  ) : null}
                  <IconButton label="إعادة تعيين كلمة المرور" onClick={() => setPending({ kind: 'reset', account: d })}>
                    <KeyRound className="size-4" aria-hidden />
                  </IconButton>
                  {d.disabled ? (
                    <IconButton label="تفعيل الحساب" onClick={() => setPending({ kind: 'enable', account: d })}>
                      <CircleCheck className="size-4" aria-hidden />
                    </IconButton>
                  ) : (
                    <IconButton label="إيقاف الحساب" onClick={() => setPending({ kind: 'disable', account: d })}>
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
        <AddDriver
          onClose={() => setAdding(false)}
          onCreated={(p) => {
            setAdding(false);
            setPassword(p);
          }}
        />
      ) : null}
      {scheduling ? <ScheduleDialog driver={scheduling} onClose={() => setScheduling(null)} /> : null}
      {money ? <DriverMoneyDialog driver={money} onClose={() => setMoney(null)} /> : null}
      {fees ? <DriverFeeDialog driver={fees} onClose={() => setFees(null)} /> : null}
      {pending ? (
        <ConfirmDialog
          title={TITLES[pending.kind]}
          message={MESSAGES[pending.kind](fullName(pending.account))}
          busy={reset.isPending || setDisabled.isPending || start.isPending}
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        />
      ) : null}
      {password ? <PasswordShown password={password} onClose={() => setPassword(null)} /> : null}
    </div>
  );
}

const TITLES = { reset: 'إعادة تعيين كلمة المرور', disable: 'إيقاف الحساب', enable: 'تفعيل الحساب', start: 'بدء الشفت' } as const;
const MESSAGES = {
  reset: (name: string) => `ستُنشأ كلمة مرور جديدة لـ ${name}، وتتوقف القديمة ويُسجَّل خروجه من كل الأجهزة.`,
  disable: (name: string) => `لن يستطيع ${name} الدخول، ويُسجَّل خروجه فوراً وتنتهي نوبته.`,
  enable: (name: string) => `سيستطيع ${name} الدخول مرة أخرى بكلمة مروره.`,
  start: (name: string) => `ستبدأ نوبة ${name} الآن، ويبدأ في استقبال الطلبات.`,
};

function AddDriver({ onClose, onCreated }: { onClose: () => void; onCreated: (password: string) => void }) {
  const create = useCreateDriver();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const ready = firstName.trim() !== '' && isEgyptianMobile(normalizePhone(phone));
  return (
    <Dialog title="إضافة مندوب" onClose={onClose}>
      <TextField label="الاسم الأول" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
      <TextField label="اسم العائلة" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <TextField label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" />
      <p className="text-xs text-tw-ink-2">تُنشأ كلمة المرور تلقائياً وتظهر مرة واحدة بعد الحفظ.</p>
      {create.isError ? <ErrorLine>{errorMessage(create.error)}</ErrorLine> : null}
      <DialogActions
        ready={ready}
        busy={create.isPending}
        onClose={onClose}
        onSave={() =>
          create.mutate(
            { firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizePhone(phone) },
            { onSuccess: (res) => onCreated(res.password) },
          )
        }
      />
    </Dialog>
  );
}

/** His own week, or the global one (§15.1 #5: "The admin can give one delivery man his own schedule"). */
function ScheduleDialog({ driver, onClose }: { driver: DriverAccount; onClose: () => void }) {
  const settings = useDriverSettings();
  const save = useSetDriverSchedule();
  const [own, setOwn] = useState(driver.schedule !== null);
  const [week, setWeek] = useState<WeekSchedule | null>(driver.schedule);
  const shown = week ?? settings.data?.schedule ?? Array.from({ length: WEEK_DAYS }, () => null);
  return (
    <Dialog title={`نوبات ${fullName(driver)}`} onClose={onClose}>
      <Switch label="جدول خاص به" checked={own} onChange={setOwn} />
      {own ? (
        <WeekEditor week={shown} onChange={setWeek} />
      ) : (
        <p className="text-sm text-tw-ink-2">يتبع الجدول العام في نوبات العمل والقواعد.</p>
      )}
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions
        ready={!own || isWeekReady(shown)}
        busy={save.isPending}
        onClose={onClose}
        onSave={() => save.mutate({ id: driver.id, schedule: own ? shown : null }, { onSuccess: onClose })}
      />
    </Dialog>
  );
}

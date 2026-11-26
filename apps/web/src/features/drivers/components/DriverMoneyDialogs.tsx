'use client';

import { type DriverAccount, type DriverFine, FEE_LIMITS, FINE_REASON_LIMIT, fineProblem, formatMoney, isFeeRuleOrNull } from '@tawsela/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ConfirmDialog, Dialog, DialogActions, ErrorLine, IconButton, LoadState, Switch, Table, TextField } from '@/components/ui';
import { useAddFine, useDriverMoney, usePayOut, useRemoveFine, useSetDriverFee } from '../api/drivers';

const fullName = (a: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`.trim();
const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: '2-digit', year: 'numeric' });
/** "#100005" or "100005" → the order id; "" is none; anything else is NaN. */
const orderIdOf = (text: string) => {
  const t = text.trim().replace(/^#/, '');
  if (!t) return undefined;
  return /^\d{6,}$/.test(t) ? Number(t) - 100000 : Number.NaN;
};

/**
 * المندوبين › الحساب [Open: names and layout ours]: his فواتيري as he sees it (owner, 2026-11-26),
 * his speed points with "تم الصرف" when he is paid them in cash, and الخصومات والغرامات: add one
 * with its reason and maybe its order (he is told), or delete one made by mistake.
 */
export function DriverMoneyDialog({ driver, onClose }: { driver: DriverAccount; onClose: () => void }) {
  const money = useDriverMoney(driver.id);
  const addFine = useAddFine(driver.id);
  const removeFine = useRemoveFine(driver.id);
  const payOut = usePayOut(driver.id);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [order, setOrder] = useState('');
  const [removing, setRemoving] = useState<DriverFine | null>(null);
  const [paying, setPaying] = useState(false);

  const orderId = orderIdOf(order);
  const fine = { amount: Number(amount), reason };
  const ready = amount.trim() !== '' && fineProblem(fine) === null && !Number.isNaN(orderId);
  const error = addFine.error ?? removeFine.error ?? payOut.error;

  return (
    <Dialog title={`حساب ${fullName(driver)}`} onClose={onClose}>
      {money.isPending || money.isError ? (
        <LoadState error={money.isError ? errorMessage(money.error) : undefined} onRetry={() => void money.refetch()} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-tw-input p-4 text-sm">
            <dt className="font-bold">صافي الأرباح (فواتيري)</dt>
            <dd className="font-bold text-tw-ok">{formatMoney(money.data.net)}</dd>
            <dt>أرباح التوصيل</dt>
            <dd>{formatMoney(money.data.earnings)}</dd>
            <dt>نقاط السرعة</dt>
            <dd>{formatMoney(money.data.pointsCash)}</dd>
            <dt>الخصومات والغرامات</dt>
            <dd className="text-tw-danger">- {formatMoney(money.data.fines)}</dd>
          </dl>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-tw-line p-4">
            <p className="text-sm">
              نقاط لم تُصرف: <span className="font-bold">{money.data.points.balance}</span> نقطة ({formatMoney(money.data.points.value)})
            </p>
            <Button tone="soft" disabled={money.data.points.balance <= 0} onClick={() => setPaying(true)}>
              تم الصرف
            </Button>
          </div>

          <section className="flex flex-col gap-3">
            <h3 className="font-bold">إضافة خصم</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="المبلغ (ج.م)" type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <TextField label="رقم الطلب (اختياري)" value={order} onChange={(e) => setOrder(e.target.value)} dir="ltr" placeholder="#100005" />
            </div>
            <TextField label="السبب" value={reason} maxLength={FINE_REASON_LIMIT} onChange={(e) => setReason(e.target.value)} />
            <Button
              disabled={!ready}
              loading={addFine.isPending}
              className="self-start"
              onClick={() =>
                addFine.mutate(
                  { amount: fine.amount, reason: reason.trim(), orderId },
                  {
                    onSuccess: () => {
                      setAmount('');
                      setReason('');
                      setOrder('');
                    },
                  },
                )
              }
            >
              إضافة الخصم
            </Button>
          </section>

          {error ? <ErrorLine>{errorMessage(error)}</ErrorLine> : null}

          {money.data.list.length === 0 ? (
            <p className="text-sm text-tw-ink-2">لا توجد خصومات</p>
          ) : (
            <Table headers={['المبلغ', 'السبب', 'الطلب', 'التاريخ', '']}>
              {money.data.list.map((f) => (
                <tr key={f.id} className="border-t border-tw-line">
                  <td className="px-4 py-2 font-semibold whitespace-nowrap text-tw-danger">{formatMoney(f.amount)}</td>
                  <td className="px-4 py-2">{f.reason}</td>
                  <td className="px-4 py-2">{f.order ? `#${f.order.code}` : '—'}</td>
                  <td className="px-4 py-2" dir="ltr">
                    {DATE.format(new Date(f.createdAt))}
                  </td>
                  <td className="px-2 py-1">
                    <IconButton label={`حذف خصم ${f.reason}`} onClick={() => setRemoving(f)}>
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}

      {removing ? (
        <ConfirmDialog
          title="حذف الخصم"
          message={`سيُحذف خصم ${formatMoney(removing.amount)} (${removing.reason}) من حساب ${fullName(driver)}.`}
          busy={removeFine.isPending}
          onConfirm={() => removeFine.mutate(removing.id, { onSettled: () => setRemoving(null) })}
          onClose={() => setRemoving(null)}
        />
      ) : null}
      {paying && money.data ? (
        <ConfirmDialog
          title="تم الصرف"
          message={`صرفت لـ ${fullName(driver)} ${formatMoney(money.data.points.value)} نقداً عن ${money.data.points.balance} نقطة؟ يبدأ رصيد نقاطه من الصفر.`}
          busy={payOut.isPending}
          onConfirm={() => payOut.mutate(undefined, { onSettled: () => setPaying(false) })}
          onClose={() => setPaying(false)}
        />
      ) : null}
    </Dialog>
  );
}

type Draft = { baseFee: string; baseKm: string; perKm: string };
const KEYS = Object.keys(FEE_LIMITS) as (keyof Draft)[];

/** His own fee rule (§8.7): it changes only what he earns, never what the customer pays. */
export function DriverFeeDialog({ driver, onClose }: { driver: DriverAccount; onClose: () => void }) {
  const save = useSetDriverFee();
  const [own, setOwn] = useState(driver.fee !== null);
  const [draft, setDraft] = useState<Draft>(() => ({
    baseFee: String(driver.fee?.baseFee ?? ''),
    baseKm: String(driver.fee?.baseKm ?? ''),
    perKm: String(driver.fee?.perKm ?? ''),
  }));
  const fee = Object.fromEntries(KEYS.map((k) => [k, draft[k].trim() === '' ? Number.NaN : Number(draft[k])])) as Record<keyof Draft, number>;
  const ready = !own || isFeeRuleOrNull(fee);
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  return (
    <Dialog title={`رسوم ${fullName(driver)}`} onClose={onClose}>
      <Switch label="رسوم خاصة به" checked={own} onChange={setOwn} />
      {own ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="الرسوم الأساسية (ج.م)" type="number" min={0} step="0.01" value={draft.baseFee} onChange={set('baseFee')} />
          <TextField label="تشمل أول (كم)" type="number" min={0} step="0.01" value={draft.baseKm} onChange={set('baseKm')} />
          <TextField label="لكل كيلو زيادة (ج.م)" type="number" min={0} step="0.01" value={draft.perKm} onChange={set('perKm')} />
        </div>
      ) : (
        <p className="text-sm text-tw-ink-2">يكسب رسوم التوصيل التي يدفعها العميل.</p>
      )}
      <p className="text-xs text-tw-ink-2">تغيّر أرباحه فقط ولا تغيّر ما يدفعه العميل، وتُحسب على الطلبات التي يأخذها بعد الحفظ.</p>
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions ready={ready} busy={save.isPending} onClose={onClose} onSave={() => save.mutate({ id: driver.id, fee: own ? fee : null }, { onSuccess: onClose })} />
    </Dialog>
  );
}

'use client';

import {
  adjustProblem,
  type CustomerAccount,
  formatMoney,
  POINTS_ADJUST_MAX,
  pointsAdjustProblem,
  WALLET_ADJUST_MAX,
  WALLET_NOTE_LIMIT,
  type WalletKind,
} from '@tawsela/shared';
import { Star, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, Table, TextField } from '@/components/ui';
import { useAdjustPoints, useAdjustWallet, useCustomers } from '../api/customers';

const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * العملاء (contract §11 A3, A5): the customers in the orders-table look with their wallet balance; the
 * wallet button adds or deducts with a reason, never below 0 [Owner, 2026-11-26]. [Open] Tawsilty's
 * page is not captured; profile, orders and block come later.
 */
export function CustomersPage() {
  const [query, setQuery] = useState('');
  const customers = useCustomers(query);
  const [adjusting, setAdjusting] = useState<CustomerAccount | null>(null);
  const [pointing, setPointing] = useState<CustomerAccount | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">العملاء</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم أو رقم الهاتف أو البريد"
        aria-label="ابحث بالاسم أو رقم الهاتف أو البريد"
        className="h-11 max-w-sm rounded-xl bg-tw-input px-4 text-sm outline-none focus:ring-2 focus:ring-tw/40"
      />

      {customers.isPending || customers.isError ? (
        <LoadState error={customers.isError ? errorMessage(customers.error) : undefined} onRetry={() => void customers.refetch()} />
      ) : customers.data.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد عملاء" />
      ) : (
        <Table headers={['الاسم', 'رقم الهاتف', 'البريد الإلكتروني', 'رصيد المحفظة', 'النقاط', 'تاريخ التسجيل', 'العمليات']}>
          {customers.data.map((c) => (
            <tr key={c.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{c.name}</td>
              <td className="px-4 py-3" dir="ltr">
                <span className="block text-end">{c.phone}</span>
              </td>
              <td className="px-4 py-3" dir="ltr">
                <span className="block text-end">{c.email ?? '—'}</span>
              </td>
              <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatMoney(c.walletBalance)}</td>
              <td className="px-4 py-3 font-semibold whitespace-nowrap">{c.pointsBalance} نقطة</td>
              <td className="px-4 py-3 whitespace-nowrap">{DATE.format(new Date(c.createdAt))}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <IconButton label={`تعديل رصيد ${c.name}`} onClick={() => setAdjusting(c)}>
                    <Wallet className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`تعديل نقاط ${c.name}`} onClick={() => setPointing(c)}>
                    <Star className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {adjusting ? <AdjustWallet customer={adjusting} onClose={() => setAdjusting(null)} /> : null}
      {pointing ? <AdjustPoints customer={pointing} onClose={() => setPointing(null)} /> : null}
    </div>
  );
}

/** Points: إضافة or خصم, whole points and the reason, which the customer sees in نقاطي [Derived]. */
function AdjustPoints({ customer, onClose }: { customer: CustomerAccount; onClose: () => void }) {
  const adjust = useAdjustPoints();
  const [kind, setKind] = useState<WalletKind>('add');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const input = { kind, points: Number(points), note };
  // A deduction over the balance is left to the server, which answers with the reason.
  const problem = points.trim() ? pointsAdjustProblem(input, Number.POSITIVE_INFINITY) : 'points';

  const save = async () => {
    try {
      await adjust.mutateAsync({ id: customer.id, ...input, note: note.trim() });
      onClose();
    } catch {
      // Shown under the fields.
    }
  };

  return (
    <Dialog title={`نقاط ${customer.name}`} onClose={onClose}>
      <p className="text-sm text-tw-ink-2">الرصيد الحالي: {customer.pointsBalance} نقطة</p>
      <KindChoice kind={kind} onChange={setKind} />
      <TextField label="عدد النقاط" type="number" inputMode="numeric" min={1} max={POINTS_ADJUST_MAX} step={1} value={points} onChange={(e) => setPoints(e.target.value)} />
      <TextField label="السبب" maxLength={WALLET_NOTE_LIMIT} value={note} onChange={(e) => setNote(e.target.value)} />
      {adjust.isError ? <ErrorLine>{errorMessage(adjust.error)}</ErrorLine> : null}
      <DialogActions ready={problem === null} busy={adjust.isPending} onSave={() => void save()} onClose={onClose} />
    </Dialog>
  );
}

function KindChoice({ kind, onChange }: { kind: WalletKind; onChange: (k: WalletKind) => void }) {
  return (
    <div role="radiogroup" aria-label="نوع الحركة" className="flex gap-2">
      {(['add', 'deduct'] as const).map((k) => (
        <label key={k} className={`flex flex-1 items-center gap-2 rounded-lg border border-tw-line px-3 py-2 text-sm ${kind === k ? 'bg-tw-50' : ''}`}>
          <input type="radio" name="kind" checked={kind === k} onChange={() => onChange(k)} className="accent-tw" />
          {k === 'add' ? 'إضافة' : 'خصم'}
        </label>
      ))}
    </div>
  );
}

/** إضافة or خصم: the amount and the reason, which the customer also sees in حركة المحفظة [Derived]. */
function AdjustWallet({ customer, onClose }: { customer: CustomerAccount; onClose: () => void }) {
  const adjust = useAdjustWallet();
  const [kind, setKind] = useState<WalletKind>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const input = { kind, amount: Number(amount), note };
  // A deduction over the balance is left to the server, which answers with the reason.
  const problem = amount.trim() ? adjustProblem(input, Number.POSITIVE_INFINITY) : 'amount';

  const save = async () => {
    try {
      await adjust.mutateAsync({ id: customer.id, ...input, note: note.trim() });
      onClose();
    } catch {
      // Shown under the fields.
    }
  };

  return (
    <Dialog title={`رصيد ${customer.name}`} onClose={onClose}>
      <p className="text-sm text-tw-ink-2">الرصيد الحالي: {formatMoney(customer.walletBalance)}</p>
      <KindChoice kind={kind} onChange={setKind} />
      <TextField label="المبلغ" type="number" inputMode="decimal" min={0.01} max={WALLET_ADJUST_MAX} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <TextField label="السبب" maxLength={WALLET_NOTE_LIMIT} value={note} onChange={(e) => setNote(e.target.value)} />
      {adjust.isError ? <ErrorLine>{errorMessage(adjust.error)}</ErrorLine> : null}
      <DialogActions ready={problem === null} busy={adjust.isPending} onSave={() => void save()} onClose={onClose} />
    </Dialog>
  );
}

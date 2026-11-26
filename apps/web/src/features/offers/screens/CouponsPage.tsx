'use client';

import { type AdminCoupon, COUPON, type CouponInput, type CouponKind, type PaidBy } from '@tawsela/shared';
import { Pencil, Ticket, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, SelectField, Switch, Table, TextField } from '@/components/ui';
import { useStores } from '@/features/catalog/api/catalog';
import { useCoupons, useDeleteCoupon, useSaveCoupon } from '../api/offers';
import { cairoDate, couponText, endOfCairoDay, PAID_BY_LABEL } from '../offer-text';

const KIND_LABEL: Record<CouponKind, string> = { amount: 'مبلغ ثابت', percent: 'نسبة مئوية' };

/**
 * التسويق والعروض › الكوبونات والقسائم (contract §11 A15) [Open: not captured; layout ours]. One kind
 * of code [Owner, 2026-11-26]: one naming a store is that store's قسيمة, one naming none works at
 * every store; who pays it and how often a customer may use it are set per code.
 */
export function CouponsPage() {
  const coupons = useCoupons();
  const save = useSaveCoupon();
  const remove = useDeleteCoupon();
  const [editing, setEditing] = useState<AdminCoupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">الكوبونات والقسائم</h1>
        <Button onClick={() => setEditing('new')}>إضافة كوبون</Button>
      </div>

      {coupons.isPending || coupons.isError ? (
        <LoadState error={coupons.isError ? errorMessage(coupons.error) : undefined} onRetry={() => void coupons.refetch()} />
      ) : coupons.data.length === 0 ? (
        <EmptyState icon={Ticket} title="لا توجد كوبونات بعد" />
      ) : (
        <Table headers={['الكود', 'الاسم', 'المتجر', 'الخصم', 'يتحمل الخصم', 'الاستخدام', 'صالح حتى', 'مفعّل', '']}>
          {coupons.data.map((c) => (
            <tr key={c.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold" dir="auto">
                {c.code}
              </td>
              <td className="px-4 py-3">{c.title}</td>
              <td className="px-4 py-3">{c.storeName ?? 'كل المتاجر'}</td>
              <td className="px-4 py-3">{couponText(c)}</td>
              <td className="px-4 py-3">{PAID_BY_LABEL[c.paidBy]}</td>
              <td className="px-4 py-3">{c.totalLimit === null ? c.used : `${c.used} / ${c.totalLimit}`}</td>
              <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                {cairoDate(c.endsAt) || '—'}
              </td>
              <td className="px-4 py-3">
                <Switch label={`تفعيل ${c.code}`} checked={c.active} disabled={save.isPending} onChange={(active) => save.mutate({ id: c.id, active })} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <IconButton label={`تعديل ${c.code}`} onClick={() => setEditing(c)}>
                    <Pencil className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`حذف ${c.code}`} onClick={() => setDeleting(c)}>
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {editing ? <CouponDialog coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف الكوبون"
          message={`سيتوقف الكود ${deleting.code} عن العمل. الطلبات التي استخدمته تبقى كما هي.`}
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
        />
      ) : null}
    </div>
  );
}

/** Empty money fields are none; anything else must be a number. */
const amount = (text: string) => (text.trim() === '' ? null : Number(text));

function CouponDialog({ coupon, onClose }: { coupon: AdminCoupon | null; onClose: () => void }) {
  const stores = useStores();
  const save = useSaveCoupon();
  const [code, setCode] = useState(coupon?.code ?? '');
  const [title, setTitle] = useState(coupon?.title ?? '');
  const [storeId, setStoreId] = useState(coupon?.storeId === null || !coupon ? 'all' : String(coupon.storeId));
  const [kind, setKind] = useState<CouponKind>(coupon?.kind ?? 'amount');
  const [value, setValue] = useState(coupon ? String(coupon.value) : '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount == null ? '' : String(coupon.maxDiscount));
  const [minOrder, setMinOrder] = useState(coupon ? String(coupon.minOrder) : '');
  const [endsOn, setEndsOn] = useState(cairoDate(coupon?.endsAt ?? null));
  const [perCustomer, setPerCustomer] = useState(String(coupon?.perCustomer ?? 1));
  const [totalLimit, setTotalLimit] = useState(coupon?.totalLimit == null ? '' : String(coupon.totalLimit));
  const [paidBy, setPaidBy] = useState<PaidBy>(coupon?.paidBy ?? 'app');

  const body: CouponInput = {
    code: code.trim(),
    title: title.trim(),
    storeId: storeId === 'all' ? null : Number(storeId),
    kind,
    value: Number(value),
    maxDiscount: kind === 'percent' ? amount(maxDiscount) : null,
    minOrder: amount(minOrder) ?? 0,
    startsAt: coupon?.startsAt ?? null,
    endsAt: endOfCairoDay(endsOn),
    perCustomer: Number(perCustomer),
    totalLimit: amount(totalLimit),
    paidBy,
    active: coupon?.active ?? true,
  };
  const ready = body.code !== '' && body.title !== '' && body.value > 0 && Number.isInteger(body.perCustomer) && body.perCustomer >= 1;
  const unit = kind === 'percent' ? '%' : 'ج.م';

  return (
    <Dialog title={coupon ? `تعديل ${coupon.code}` : 'إضافة كوبون'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="الكود" maxLength={COUPON.codeMaxLength} value={code} onChange={(e) => setCode(e.target.value)} dir="auto" />
        <TextField label="الاسم" maxLength={COUPON.titleMaxLength} value={title} onChange={(e) => setTitle(e.target.value)} />
        <SelectField
          label="المتجر"
          value={storeId}
          options={[{ value: 'all', label: 'كل المتاجر' }, ...(stores.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]}
          onChange={setStoreId}
        />
        <SelectField label="نوع الخصم" value={kind} options={(['amount', 'percent'] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))} onChange={setKind} />
        <TextField label={`قيمة الخصم (${unit})`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        {kind === 'percent' ? (
          <TextField label="أقصى خصم (ج.م)" inputMode="decimal" placeholder="بدون حد" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
        ) : null}
        <TextField label="الحد الأدنى للطلب (ج.م)" inputMode="decimal" placeholder="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
        <TextField label="صالح حتى" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        <TextField label="مرات الاستخدام لكل عميل" inputMode="numeric" value={perCustomer} onChange={(e) => setPerCustomer(e.target.value)} />
        <TextField label="الحد الإجمالي للاستخدام" inputMode="numeric" placeholder="بدون حد" value={totalLimit} onChange={(e) => setTotalLimit(e.target.value)} />
        <SelectField label="يتحمل الخصم" value={paidBy} options={(['app', 'store'] as const).map((p) => ({ value: p, label: PAID_BY_LABEL[p] }))} onChange={setPaidBy} />
      </div>
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions ready={ready} busy={save.isPending} onSave={() => save.mutate({ ...body, id: coupon?.id }, { onSuccess: onClose })} onClose={onClose} />
    </Dialog>
  );
}

'use client';

import { cashDue, formatMoney, type OrderLine, type OrderStatus, orderStatusLabel, type PartnerAction, type PartnerOrderDetails } from '@tawsela/shared';
import { CalendarDays, ClipboardList, MapPin, NotebookText, Phone, Printer } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button, Dialog, EmptyState, ErrorLine, LoadState, Pill, Table } from '@/components/ui';
import { ORDER_TABS } from '../orders/OrdersPage';
import { usePartnerOrder, usePartnerOrders, usePartnerStep } from './api';
import { usePartnerLive } from './live';

const CAIRO = 'Africa/Cairo';

/** "منذ 1 دقيقة", as on the partner app's order cards. */
function ago(iso: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `منذ ${hours} ساعة` : new Date(iso).toLocaleDateString('en-US', { timeZone: CAIRO });
}

const when = (scheduledFor: string | null) =>
  scheduledFor ? new Date(scheduledFor).toLocaleTimeString('en-US', { timeZone: CAIRO, hour: 'numeric', minute: '2-digit' }) : 'الآن';

/**
 * /partner/orders (contract §9, §11.1): the store's orders by status in the admin table's look, live.
 * A new order opens the partner app's popup (partner/partner-home-new-orders-accept-reject-popup.png);
 * التفاصيل opens the details (partner-order-details-*.png) with the next step and the print button.
 * [Open] Tawsilty's partner web pages are not captured; the connection line is ours.
 */
export function PartnerOrdersPage() {
  const connected = usePartnerLive();
  const [tab, setTab] = useState<OrderStatus>('pending_review');
  const [open, setOpen] = useState<number>();
  const orders = usePartnerOrders(tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <span className={`text-sm font-semibold ${connected ? 'text-tw-ok' : 'text-tw-ink-2'}`}>{connected ? 'متصل' : 'غير متصل'}</span>
      </div>
      <div role="tablist" className="flex flex-wrap gap-6 border-b border-tw-line">
        {ORDER_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2 text-sm font-semibold ${tab === t ? 'border-tw text-tw' : 'border-transparent text-tw-ink-2 hover:text-tw'}`}
          >
            {orderStatusLabel(t)}
          </button>
        ))}
      </div>

      {orders.isPending || orders.isError ? (
        <LoadState error={orders.isError ? errorMessage(orders.error) : undefined} onRetry={() => void orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="لا توجد طلبات" />
      ) : (
        <Table headers={['الكود', 'الوقت', 'المنتجات', 'الإجمالي', 'طريقة الدفع', 'العمليات']}>
          {orders.data.map((o) => (
            <tr key={o.id} className="border-t border-tw-line">
              <td className={`px-4 py-3 ${o.note.trim() ? 'border-s-4 border-s-tw-danger' : ''}`}>
                <span className="font-semibold" dir="ltr">
                  #{o.code}
                </span>
                {o.note.trim() ? <p className="mt-1 max-w-56 text-xs text-tw-danger">{o.note}</p> : null}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{ago(o.createdAt)}</td>
              <td className="px-4 py-3">{o.count}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatMoney(o.total)}</td>
              <td className="px-4 py-3 whitespace-nowrap">الدفع عند الاستلام</td>
              <td className="px-4 py-2">
                <Button tone="soft" className="h-9 px-4" onClick={() => setOpen(o.id)}>
                  التفاصيل
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <NewOrderPopup />
      {open !== undefined ? <OrderDetailsDialog id={open} onClose={() => setOpen(undefined)} /> : null}
    </div>
  );
}

/**
 * The popup over the list as soon as an order arrives: the oldest new order not yet answered. Closing
 * it without an answer leaves the order in قيد المراجعة; the next arrival opens the popup again.
 */
function NewOrderPopup() {
  const pending = usePartnerOrders('pending_review');
  const [dismissed, setDismissed] = useState<ReadonlySet<number>>(new Set());
  const next = pending.data?.findLast((o) => !dismissed.has(o.id));
  const order = usePartnerOrder(next?.id);
  const step = usePartnerStep();
  if (!next || !order.data) return null;
  const o = order.data;
  const answer = (action: PartnerAction) => step.mutate({ id: o.id, action }, { onSuccess: () => step.reset() });
  return (
    <Dialog title={`طلب رقم # ${o.code}`} onClose={() => setDismissed((s) => new Set(s).add(o.id))}>
      <p className="font-medium">هل تريد قبول أو رفض الطلب ?</p>
      {o.note.trim() ? (
        <div>
          <p className="font-bold">ملاحظات العميل</p>
          <p className="font-semibold text-tw-danger">{o.note}</p>
        </div>
      ) : null}
      <p className="font-bold text-tw">المنتجات {o.lines.length}</p>
      <ul className="flex flex-col gap-3">
        {o.lines.map((line, i) => (
          <li key={i} className="flex items-center gap-3">
            <LineImage line={line} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{line.name}</p>
              <LineChoices line={line} />
              <p className="font-semibold text-tw">{formatMoney(line.unitPrice)}</p>
            </div>
            <span className="rounded-full border border-tw-ink-2 px-3 py-1 text-sm font-semibold text-tw">{line.quantity} عناصر</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-xl bg-tw-input px-4 py-3 text-sm">
        <span>طريقة الدفع</span>
        <span className="font-semibold">الدفع عند الاستلام</span>
        <span className="font-bold">{formatMoney(o.total)}</span>
      </div>
      {step.error ? <ErrorLine>{errorMessage(step.error)}</ErrorLine> : null}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={step.isPending} onClick={() => answer('accept')} className="h-12 rounded-md bg-tw-ok font-semibold text-white disabled:opacity-50">
          قبول
        </button>
        <button type="button" disabled={step.isPending} onClick={() => answer('reject')} className="h-12 rounded-md bg-tw-danger font-semibold text-white disabled:opacity-50">
          رفض
        </button>
      </div>
    </Dialog>
  );
}

function LineImage({ line }: { line: OrderLine }) {
  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-tw-input">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {line.image ? <img src={mediaUrl(line.image)} alt="" className="size-full object-cover" /> : null}
    </div>
  );
}

function LineChoices({ line }: { line: OrderLine }) {
  const parts = [...line.options, ...(line.removedIngredients.length ? [`بدون: ${line.removedIngredients.join('، ')}`] : [])];
  return parts.length ? <p className="text-xs text-tw-ink-2">{parts.join(' · ')}</p> : null;
}

function OrderDetailsDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const order = usePartnerOrder(id);
  const step = usePartnerStep();
  return (
    <Dialog title={order.data ? `الطلب # ${order.data.code}` : 'الطلب'} onClose={onClose}>
      {order.isPending || order.isError ? (
        <LoadState error={order.isError ? errorMessage(order.error) : undefined} onRetry={() => void order.refetch()} />
      ) : (
        <Details order={order.data} busy={step.isPending} onStep={(action) => step.mutate({ id, action })} error={step.error ? errorMessage(step.error) : undefined} />
      )}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-tw-ink-2">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

/** The order details (partner/partner-order-details-preparing-receive-from-driver.png), and the store's next step. */
function Details({ order: o, busy, onStep, error }: { order: PartnerOrderDetails; busy: boolean; onStep: (a: PartnerAction) => void; error?: string }) {
  const collects = o.mode === 'delivery' && o.deliveredBy === 'platform' && o.payoutOption !== 'nothing';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm text-tw-ink-2">
          <CalendarDays className="size-4 text-tw" aria-hidden />
          {new Date(o.createdAt).toLocaleDateString('en-US', { timeZone: CAIRO })}
        </span>
        <button type="button" aria-label="طباعة" onClick={() => window.print()} className="rounded-full p-2 text-tw hover:bg-tw-50">
          <Printer className="size-5" aria-hidden />
        </button>
      </div>
      <Pill tone={o.status === 'rejected' || o.status === 'cancelled' ? 'danger' : o.status === 'delivered' ? 'ok' : 'muted'}>{orderStatusLabel(o.status)}</Pill>
      <div className="flex items-center justify-between gap-3 border-b border-tw-line pb-3">
        <div>
          <p className="font-semibold">{o.customer.name}</p>
          <p className="text-sm" dir="ltr">
            {o.customer.phone}
          </p>
        </div>
        <a href={`tel:${o.customer.phone}`} className="flex items-center gap-1 rounded-full border border-tw-ok px-4 py-1.5 text-sm font-semibold text-tw-ok">
          <Phone className="size-4" aria-hidden />
          اتصال
        </a>
      </div>
      {o.mode === 'delivery' ? (
        <div className="flex items-start justify-between gap-3 border-b border-tw-line pb-3">
          <div>
            <p className="font-bold">التوصيل إلى</p>
            <p className="text-sm text-tw-ink-2">{o.addressText}</p>
          </div>
          <MapPin className="size-5 shrink-0 text-tw" aria-hidden />
        </div>
      ) : (
        <p className="border-b border-tw-line pb-3 font-bold">استلام من المحل</p>
      )}
      <Row label={o.mode === 'delivery' ? 'موعد التوصيل' : 'موعد الاستلام'}>{when(o.scheduledFor)}</Row>
      {o.note.trim() ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">ملاحظات العميل</p>
            <p className="font-semibold text-tw-danger">{o.note}</p>
          </div>
          <NotebookText className="size-5 shrink-0 text-tw" aria-hidden />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-tw-line pt-3">
        <div className="flex items-center justify-between">
          <p className="font-bold">المنتجات</p>
          <span className="text-sm text-tw">{o.lines.length} منتج</span>
        </div>
        {o.lines.map((line, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p>{`${line.quantity} × ${line.name}`}</p>
              <LineChoices line={line} />
            </div>
            <span className="whitespace-nowrap text-tw-ink-2">{formatMoney(line.unitPrice * line.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-tw-line pt-3">
        <Row label="الإجمالى">{formatMoney(o.itemsTotal)}</Row>
        <Row label="كلفة التوصيل">{formatMoney(o.deliveryFee)}</Row>
        <Row label="رسوم طريقة الدفع">{formatMoney(0)}</Row>
        {/* A discount shows in red (§9): here what the wallet paid; المجموع is what the customer still pays. */}
        {o.walletPaid - o.invitePaid > 0 ? (
          <Row label="المدفوع من المحفظة">
            <span className="text-tw-danger">-{formatMoney(o.walletPaid - o.invitePaid)}</span>
          </Row>
        ) : null}
        {o.invitePaid > 0 ? (
          <Row label="المدفوع من رصيد دعوة الأصدقاء">
            <span className="text-tw-danger">-{formatMoney(o.invitePaid)}</span>
          </Row>
        ) : null}
        {o.pointsPaid > 0 ? (
          <Row label="المدفوع بالنقاط">
            <span className="text-tw-danger">-{formatMoney(o.pointsPaid)}</span>
          </Row>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-tw-line pt-3">
        <Row label="المجموع">{formatMoney(cashDue(o))}</Row>
        <Row label="طريقة الدفع">{cashDue(o) === 0 ? 'مدفوع بالكامل' : 'الدفع عند الاستلام'}</Row>
      </div>
      {o.driver ? <Row label="معلومات المندوب">{o.driver.name}</Row> : null}
      {collects ? (
        <div className="flex items-center justify-between rounded-xl border border-tw-100 bg-tw-50 px-4 py-3 font-semibold text-tw">
          <span>استلم من المندوب</span>
          <span>{formatMoney(o.storeFromDriver)}</span>
        </div>
      ) : null}
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {o.status === 'pending_review' ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={() => onStep('accept')} className="h-12 rounded-md bg-tw-ok font-semibold text-white disabled:opacity-50">
            قبول
          </button>
          <button type="button" disabled={busy} onClick={() => onStep('reject')} className="h-12 rounded-md bg-tw-danger font-semibold text-white disabled:opacity-50">
            رفض
          </button>
        </div>
      ) : o.status === 'preparing' ? (
        <>
          <p className="text-center text-sm text-tw-ink-2">يرجى إرسال تجهيز الطلب قبل ٥ دقائق من موعد الاستلام ليتسنى للكابتن استلامه في الوقت المحدد.</p>
          <Button loading={busy} onClick={() => onStep('ready')} className="h-12">
            تم التجهيز
          </Button>
        </>
      ) : o.status === 'ready' && o.mode === 'pickup' ? (
        <Button loading={busy} onClick={() => onStep('collected')} className="h-12">
          تم الاستلام
        </Button>
      ) : o.mode === 'delivery' && o.deliveredBy === 'store' && o.status === 'ready' ? (
        <Button loading={busy} onClick={() => onStep('out')} className="h-12">
          خارج للتوصيل
        </Button>
      ) : o.mode === 'delivery' && o.deliveredBy === 'store' && o.status === 'out_for_delivery' ? (
        <Button loading={busy} onClick={() => onStep('delivered')} className="h-12">
          تم التوصيل
        </Button>
      ) : null}
    </div>
  );
}

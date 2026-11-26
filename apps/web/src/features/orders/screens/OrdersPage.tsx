'use client';

import { type AdminOrder, cashDue, formatMoney, type OrderStatus, orderStatusLabel } from '@tawsela/shared';
import { Bike, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, Table, TextField } from '@/components/ui';
import { useAssignDriver, useDrivers } from '@/features/drivers/api/drivers';
import { ShiftPill } from '@/features/drivers/screens/DriversPage';
import { useAdminOrders } from '../api/orders';

/** The tabs in Tawsilty's order: its capture shows the first three; the rest follow the order flow. */
export const ORDER_TABS: OrderStatus[] = ['pending_review', 'preparing', 'out_for_delivery', 'ready', 'delivered', 'rejected', 'cancelled'];

/**
 * الطلبات (contract §11, admin/admin-orders-list-sidebar-status-tabs-flags.png): status tabs with the
 * active one in orange, an orange header row, "#504578" codes with outlined flag pills and a red bar
 * beside a flagged row. [Open] The middle columns are hidden in the capture; these follow the demo.
 * 🛵 gives an accepted delivery to a delivery man (Phase 13); notifying waits for push (Phase 16).
 */
export function OrdersPage() {
  const [tab, setTab] = useState<OrderStatus>('pending_review');
  const orders = useAdminOrders(tab);
  const [assigning, setAssigning] = useState<AdminOrder | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">الطلبات</h1>
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
        <Table headers={['الكود', 'المتجر', 'العميل', 'الإجمالي', 'طريقة الدفع', 'الكابتن', 'العمليات']}>
          {orders.data.map((o) => (
            <OrderRow key={o.id} order={o} onAssign={() => setAssigning(o)} />
          ))}
        </Table>
      )}
      {assigning ? <AssignDriver order={assigning} onClose={() => setAssigning(null)} /> : null}
    </div>
  );
}

/** Needs one of the app's captains: a delivery the store does not bring itself. */
const needsCaptain = (o: AdminOrder) => o.mode === 'delivery' && o.deliveredBy === 'platform';
/** The admin may give it to one until it leaves the store. */
const canAssign = (o: AdminOrder) => needsCaptain(o) && (o.status === 'preparing' || o.status === 'ready');

function OrderRow({ order: o, onAssign }: { order: AdminOrder; onAssign: () => void }) {
  const flags = [...(o.hasDriver || !needsCaptain(o) ? [] : ['بدون كابتن']), ...(o.note.trim() ? ['ملاحظات'] : [])];
  return (
    <tr className="border-t border-tw-line">
      <td className={`px-4 py-3 ${flags.length ? 'border-s-4 border-s-tw-danger' : ''}`}>
        <span className="font-semibold" dir="ltr">
          #{o.code}
        </span>
        {flags.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {flags.map((f) => (
              <span key={f} className="rounded-full border border-tw-danger px-2 py-0.5 text-xs font-semibold text-tw-danger">
                {f}
              </span>
            ))}
          </div>
        ) : null}
        {o.note.trim() ? <p className="mt-1 max-w-56 text-xs text-tw-danger">{o.note}</p> : null}
      </td>
      <td className="px-4 py-3">{o.store.name}</td>
      <td className="px-4 py-3">
        <span className="block">{o.customer.name}</span>
        <span className="block text-xs text-tw-ink-2" dir="ltr">
          {o.customer.phone}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="block">{formatMoney(o.total)}</span>
        {o.walletPaid > 0 ? <span className="block text-xs text-tw-ink-2">منها {formatMoney(o.walletPaid)} من المحفظة</span> : null}
        {o.pointsPaid > 0 ? <span className="block text-xs text-tw-ink-2">منها {formatMoney(o.pointsPaid)} بالنقاط</span> : null}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{cashDue(o) === 0 ? 'مدفوع بالكامل' : 'الدفع عند الاستلام'}</td>
      <td className="px-4 py-3">{o.mode === 'pickup' ? 'استلام من المحل' : o.deliveredBy === 'store' ? 'توصيل المتجر' : (o.driver?.name ?? '—')}</td>
      <td className="px-4 py-2">
        {canAssign(o) ? (
          <IconButton label={`تعيين كابتن للطلب #${o.code}`} onClick={onAssign}>
            <Bike className="size-4" aria-hidden />
          </IconButton>
        ) : null}
      </td>
    </tr>
  );
}

/** The 🛵: pick a delivery man, those working now first. It may replace the one who has it. */
function AssignDriver({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const drivers = useDrivers(query);
  const assign = useAssignDriver();
  const [picked, setPicked] = useState<number | null>(order.driver?.id ?? null);
  const list = [...(drivers.data ?? [])].filter((d) => !d.disabled).sort((a, b) => Number(b.onShift) - Number(a.onShift));
  return (
    <Dialog title={`تعيين كابتن للطلب #${order.code}`} onClose={onClose}>
      <TextField label="ابحث بالاسم أو رقم الهاتف" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div role="radiogroup" aria-label="المندوبين" className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {drivers.isError ? <ErrorLine>{errorMessage(drivers.error)}</ErrorLine> : null}
        {drivers.data && list.length === 0 ? <p className="text-sm text-tw-ink-2">لا يوجد مندوبين</p> : null}
        {list.map((d) => (
          <label key={d.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${picked === d.id ? 'bg-tw-50' : ''}`}>
            <input type="radio" name="driver" checked={picked === d.id} onChange={() => setPicked(d.id)} className="accent-tw" />
            <span className="flex-1 font-semibold">{`${d.firstName} ${d.lastName}`.trim()}</span>
            <ShiftPill driver={d} />
          </label>
        ))}
      </div>
      {assign.isError ? <ErrorLine>{errorMessage(assign.error)}</ErrorLine> : null}
      <DialogActions
        ready={picked !== null && picked !== order.driver?.id}
        busy={assign.isPending}
        onClose={onClose}
        onSave={() => picked !== null && assign.mutate({ orderId: order.id, driverId: picked }, { onSuccess: onClose })}
      />
    </Dialog>
  );
}

'use client';

import { type AdminOrder, formatMoney, type OrderStatus, orderStatusLabel } from '@tawsela/shared';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { EmptyState, LoadState, Table } from '@/components/ui';
import { useAdminOrders } from './api';

/** The tabs in Tawsilty's order: its capture shows the first three; the rest follow the order flow. */
export const ORDER_TABS: OrderStatus[] = ['pending_review', 'preparing', 'out_for_delivery', 'ready', 'delivered', 'rejected', 'cancelled'];

/**
 * الطلبات (contract §11, admin/admin-orders-list-sidebar-status-tabs-flags.png): status tabs with the
 * active one in orange, an orange header row, "#504578" codes with outlined flag pills and a red bar
 * beside a flagged row. [Open] The middle columns are hidden in the capture; these follow the demo.
 * Assigning a captain and notifying arrive with the drivers (Phase 13).
 */
export function OrdersPage() {
  const [tab, setTab] = useState<OrderStatus>('pending_review');
  const orders = useAdminOrders(tab);

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
        <Table headers={['الكود', 'المتجر', 'العميل', 'الإجمالي', 'طريقة الدفع', 'الكابتن']}>
          {orders.data.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Table>
      )}
    </div>
  );
}

function OrderRow({ order: o }: { order: AdminOrder }) {
  const flags = [...(o.hasDriver || o.mode === 'pickup' ? [] : ['بدون كابتن']), ...(o.note.trim() ? ['ملاحظات'] : [])];
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
      <td className="px-4 py-3 whitespace-nowrap">{formatMoney(o.total)}</td>
      <td className="px-4 py-3 whitespace-nowrap">الدفع عند الاستلام</td>
      <td className="px-4 py-3">{o.mode === 'pickup' ? 'استلام من المحل' : '—'}</td>
    </tr>
  );
}

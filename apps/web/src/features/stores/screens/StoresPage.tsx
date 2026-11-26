'use client';

import { formatMoney, VERTICALS, type Vertical, verticalLabel } from '@tawsela/shared';
import { Package, Pencil, Plus, Store } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { EmptyState, LoadState, Pill, Table } from '@/components/ui';
import { useStores } from '../../catalog/api/catalog';
import { PAYOUT_SHORT } from '../../settings/payout';

type Tab = 'all' | Vertical;

/**
 * الموردين (contract §11, §1.1 A6): the stores in the orders-table look, with type tabs like the
 * orders page's status tabs. [Open] Tawsilty's stores page is not captured; this follows its orders page.
 */
export function StoresPage() {
  const stores = useStores();
  const [tab, setTab] = useState<Tab>('all');
  const rows = stores.data?.filter((s) => tab === 'all' || s.vertical === tab) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">الموردين</h1>
        <Link href="/stores/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-tw px-6 text-sm font-semibold text-white hover:bg-tw-700">
          <Plus className="size-4" aria-hidden />
          إضافة متجر
        </Link>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {(['all', ...VERTICALS] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 rounded-full px-5 text-sm font-semibold ${tab === t ? 'bg-tw text-white' : 'bg-tw-input text-tw-ink-2 hover:bg-tw-50'}`}
          >
            {t === 'all' ? 'الكل' : verticalLabel(t)}
          </button>
        ))}
      </div>

      {stores.isPending || stores.isError ? (
        <LoadState error={stores.isError ? errorMessage(stores.error) : undefined} onRetry={() => void stores.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Store} title="لا توجد متاجر" message="أضف متجراً وسيُنشأ حساب المورد معه" />
      ) : (
        <Table headers={['المتجر', 'النوع', 'حساب المورد', 'الدفع للمتجر', 'الحد الأدنى', 'الحالة', 'العمليات']}>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{s.name}</td>
              <td className="px-4 py-3">{verticalLabel(s.vertical)}</td>
              <td className="px-4 py-3" dir="ltr">
                <span className="block text-end">{s.partners[0]?.phone ?? '—'}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{s.payoutOption ? PAYOUT_SHORT[s.payoutOption] : 'حسب الإعدادات'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatMoney(s.minimumOrder)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {s.active ? <Pill tone={s.isOpen ? 'ok' : 'danger'}>{s.isOpen ? 'مفتوح' : 'مغلق'}</Pill> : <Pill tone="muted">مخفي</Pill>}
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <Link href={`/stores/${s.id}`} aria-label="تعديل" title="تعديل" className="grid size-9 place-items-center rounded-lg text-tw-ink-2 hover:bg-tw-50 hover:text-tw">
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <Link
                    href={`/products?store=${s.id}`}
                    aria-label="المنتجات"
                    title="المنتجات"
                    className="grid size-9 place-items-center rounded-lg text-tw-ink-2 hover:bg-tw-50 hover:text-tw"
                  >
                    <Package className="size-4" aria-hidden />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

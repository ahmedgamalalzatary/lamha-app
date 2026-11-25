'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { AuditAction, AuditEntry, AuditPage as Page } from '@tawsela/shared';
import { History } from 'lucide-react';
import { api } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button, EmptyState, ErrorLine, LoadState, Table } from '@/components/ui';

const ACTIONS: Record<AuditAction, string> = {
  'admin.create': 'إضافة مسؤول',
  'admin.password': 'إعادة تعيين كلمة مرور مسؤول',
  'admin.disable': 'إيقاف مسؤول',
  'admin.enable': 'تفعيل مسؤول',
  'partner.create': 'إضافة حساب متجر',
  'partner.password': 'إعادة تعيين كلمة مرور متجر',
  'partner.disable': 'إيقاف حساب متجر',
  'partner.enable': 'تفعيل حساب متجر',
  'store.create': 'إضافة متجر',
  'store.update': 'تعديل متجر',
  'zone.create': 'إضافة منطقة',
  'zone.update': 'تعديل منطقة',
  'settings.delivery': 'تعديل رسوم التوصيل والدفع',
};

/** The fields' names as the forms show them; any other field keeps its own name. */
const FIELDS: Record<string, string> = {
  name: 'الاسم',
  active: 'مفعل',
  closedNow: 'مغلق الآن',
  deliveryFee: 'رسوم التوصيل',
  minimumOrder: 'الحد الأدنى للطلب',
  deliveryMinutes: 'مدة التوصيل',
  opensAt: 'يفتح',
  closesAt: 'يغلق',
  zoneId: 'المنطقة',
  corners: 'نقاط الحدود',
  phone: 'الهاتف',
  storeId: 'المتجر',
  pickupAllowed: 'الاستلام من المحل',
  layout: 'شكل القائمة',
  vertical: 'النوع',
};

const show = (v: unknown) => (v === true ? 'نعم' : v === false ? 'لا' : v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** "مفعل: لا · رسوم التوصيل: 20". */
const describe = (details: Record<string, unknown>) =>
  Object.entries(details)
    .map(([k, v]) => `${FIELDS[k] ?? k}: ${show(v)}`)
    .join(' · ');

const CAIRO = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "2026/11/24 12:30" in Cairo time, Latin digits (contract §7). */
function cairoTime(iso: string): string {
  const p = Object.fromEntries(CAIRO.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/**
 * الإعدادات › سجل التغييرات (review F70): who changed admin and partner accounts, stores and zones,
 * and when, newest first. Generated passwords are never written. [Open] Not in Tawsilty's captures:
 * the name, columns and wording are ours, and the records are kept until the owner sets a retention.
 */
export function AuditPage() {
  const log = useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }) => api.request<Page>(`/admin/audit${pageParam ? `?before=${pageParam}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const entries: AuditEntry[] = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">سجل التغييرات</h1>
        <p className="text-sm text-tw-ink-2">من غيّر الحسابات والمتاجر والمناطق، ومتى.</p>
      </div>
      {log.isPending || (log.isError && !entries.length) ? (
        <LoadState error={log.isError ? errorMessage(log.error) : undefined} onRetry={() => void log.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="لا توجد تغييرات بعد" />
      ) : (
        <>
          <Table headers={['الوقت', 'المسؤول', 'الإجراء', 'العنصر', 'التفاصيل']}>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-tw-line align-top">
                <td dir="ltr" className="px-4 py-3 text-end whitespace-nowrap">
                  {cairoTime(e.at)}
                </td>
                <td className="px-4 py-3">{e.actor.name}</td>
                <td className="px-4 py-3 font-semibold">{ACTIONS[e.action] ?? e.action}</td>
                <td className="px-4 py-3">{e.target.name}</td>
                <td className="px-4 py-3 text-tw-ink-2">{describe(e.details)}</td>
              </tr>
            ))}
          </Table>
          {log.isFetchNextPageError ? <ErrorLine>{errorMessage(log.error)}</ErrorLine> : null}
          {log.hasNextPage ? (
            <Button tone="soft" className="self-start" loading={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
              عرض المزيد
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

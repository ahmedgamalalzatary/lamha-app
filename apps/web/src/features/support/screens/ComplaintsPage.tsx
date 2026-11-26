'use client';

import { type AdminTicket, ratingTagLabel, type TicketType } from '@tawsela/shared';
import { MessageSquareWarning, Star } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, EmptyState, LoadState, Pill, Table } from '@/components/ui';
import { useRatings, useSetTicketStatus, useTickets } from '../api/support';

const TABS = [
  { key: 'complaint', label: 'الشكاوى' },
  { key: 'suggestion', label: 'الاقتراحات' },
  { key: 'ratings', label: 'التقييمات' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** 01xxxxxxxxx → 201xxxxxxxxx for wa.me. */
const whatsapp = (phone: string) => `https://wa.me/2${phone.replace(/\D/g, '')}`;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'short', timeStyle: 'short' });

/**
 * العملاء › الشكاوى والاقتراحات (contract §11) [Open: not captured; the orders table's look]. The admin
 * reads each one, calls or WhatsApps the customer, and marks it done; there is no reply in the app
 * [Owner, 2026-11-25]. التقييمات lists the customers' ratings.
 */
export function ComplaintsPage() {
  const [tab, setTab] = useState<Tab>('complaint');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">الشكاوى والاقتراحات</h1>
      <div role="tablist" className="flex flex-wrap gap-6 border-b border-tw-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 pb-2 text-sm font-semibold ${tab === t.key ? 'border-tw text-tw' : 'border-transparent text-tw-ink-2 hover:text-tw'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'ratings' ? <Ratings /> : <Tickets key={tab} type={tab} />}
    </div>
  );
}

function Tickets({ type }: { type: TicketType }) {
  const tickets = useTickets(type);
  if (tickets.isPending || tickets.isError) {
    return <LoadState error={tickets.isError ? errorMessage(tickets.error) : undefined} onRetry={() => void tickets.refetch()} />;
  }
  if (tickets.data.length === 0) return <EmptyState icon={MessageSquareWarning} title={type === 'complaint' ? 'لا توجد شكاوى' : 'لا توجد اقتراحات'} />;
  return (
    <Table headers={['العميل', type === 'complaint' ? 'الشكوى' : 'الاقتراح', 'الطلب', 'التاريخ', 'الحالة', 'العمليات']}>
      {tickets.data.map((t) => (
        <TicketRow key={t.id} ticket={t} />
      ))}
    </Table>
  );
}

function TicketRow({ ticket: t }: { ticket: AdminTicket }) {
  const setStatus = useSetTicketStatus();
  return (
    <tr className="border-t border-tw-line align-top">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          {t.customer.name}
          {/* A delivery man's complaint or suggestion (§10) [Derived]. */}
          {t.customer.role === 'driver' ? <Pill tone="muted">مندوب</Pill> : null}
        </div>
        <div className="flex items-center gap-2 text-tw-ink-2" dir="ltr">
          <a href={`tel:${t.customer.phone}`}>{t.customer.phone}</a>
          <a href={whatsapp(t.customer.phone)} target="_blank" rel="noreferrer" aria-label={`واتساب ${t.customer.phone}`} className="text-tw-ok">
            واتساب
          </a>
        </div>
      </td>
      <td className="max-w-md px-4 py-3 whitespace-pre-wrap">{t.text}</td>
      <td className="px-4 py-3">
        {t.order ? (
          <>
            <div className="font-semibold" dir="ltr">
              #{t.order.code}
            </div>
            <div className="text-tw-ink-2">{t.order.store}</div>
          </>
        ) : (
          <span className="text-tw-ink-2">عامة</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
        {when(t.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Pill tone={t.status === 'done' ? 'ok' : 'danger'}>{t.status === 'done' ? 'تم الحل' : 'مفتوحة'}</Pill>
      </td>
      <td className="px-4 py-3">
        {t.status === 'open' ? (
          <Button tone="soft" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: t.id, status: 'done' })}>
            تم الحل
          </Button>
        ) : (
          <button type="button" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: t.id, status: 'open' })} className="text-sm font-semibold text-tw-ink-2 hover:text-tw">
            إعادة فتح
          </button>
        )}
      </td>
    </tr>
  );
}

function Ratings() {
  const ratings = useRatings();
  if (ratings.isPending || ratings.isError) {
    return <LoadState error={ratings.isError ? errorMessage(ratings.error) : undefined} onRetry={() => void ratings.refetch()} />;
  }
  if (ratings.data.length === 0) return <EmptyState icon={Star} title="لا توجد تقييمات" />;
  return (
    <Table headers={['العميل', 'المتجر', 'الطلب', 'التقييم', 'الأسباب', 'التعليق', 'التاريخ']}>
      {ratings.data.map((r) => (
        <tr key={r.id} className="border-t border-tw-line align-top">
          <td className="px-4 py-3">
            <div className="font-semibold">{r.customer.name}</div>
            <div className="text-tw-ink-2" dir="ltr">
              {r.customer.phone}
            </div>
          </td>
          <td className="px-4 py-3">{r.store.name}</td>
          <td className="px-4 py-3 font-semibold" dir="ltr">
            #{r.order.code}
          </td>
          <td className="px-4 py-3">
            <span role="img" aria-label={`${r.stars} من 5 نجوم`} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-4 ${n <= r.stars ? 'fill-tw text-tw' : 'text-tw-line'}`} aria-hidden />
              ))}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {r.tags.map((tag) => (
                <Pill key={tag} tone={r.stars <= 3 ? 'danger' : 'ok'}>
                  {ratingTagLabel(tag)}
                </Pill>
              ))}
            </div>
          </td>
          <td className="max-w-sm px-4 py-3 whitespace-pre-wrap">{r.text}</td>
          <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
            {when(r.createdAt)}
          </td>
        </tr>
      ))}
    </Table>
  );
}

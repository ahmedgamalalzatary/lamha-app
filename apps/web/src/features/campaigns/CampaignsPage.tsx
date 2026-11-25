'use client';

import { CAMPAIGN_BODY_LIMIT, CAMPAIGN_TITLE_LIMIT } from '@tawsela/shared';
import { BellRing } from 'lucide-react';
import { useId, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ConfirmDialog, EmptyState, ErrorLine, LoadState, SelectField, Table, TextField } from '@/components/ui';
import { useZones } from '@/features/zones/api';
import { useCampaigns, useSendCampaign } from './api';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'short', timeStyle: 'short' });

/**
 * التسويق والعروض › الإشعارات التفاعلية (contract §11) [Open: not captured; layout ours]: a push and a
 * الإشعارات entry, sent now to every customer or to those with an address in one zone [Owner, 2026-11-25].
 */
export function CampaignsPage() {
  const zones = useZones();
  const campaigns = useCampaigns();
  const send = useSendCampaign();
  const bodyId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [zone, setZone] = useState('all');
  const [confirming, setConfirming] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);
  const ready = title.trim() !== '' && body.trim() !== '';
  const zoneName = zones.data?.find((z) => String(z.id) === zone)?.name;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">الإشعارات التفاعلية</h1>

      <section className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <TextField
          label="العنوان"
          maxLength={CAMPAIGN_TITLE_LIMIT}
          value={title}
          onChange={(e) => {
            setSentTo(null);
            setTitle(e.target.value);
          }}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={bodyId} className="text-sm font-medium text-tw-ink">
            الرسالة
          </label>
          <textarea
            id={bodyId}
            rows={3}
            maxLength={CAMPAIGN_BODY_LIMIT}
            value={body}
            onChange={(e) => {
              setSentTo(null);
              setBody(e.target.value);
            }}
            className="rounded-xl bg-tw-input p-4 text-sm outline-none focus:ring-2 focus:ring-tw/40"
          />
        </div>
        <SelectField
          label="إلى"
          value={zone}
          options={[{ value: 'all', label: 'كل العملاء' }, ...(zones.data ?? []).map((z) => ({ value: String(z.id), label: z.name }))]}
          onChange={setZone}
        />
        {send.error ? <ErrorLine>{errorMessage(send.error)}</ErrorLine> : null}
        <div className="flex items-center gap-4">
          <Button disabled={!ready} className="min-w-40" onClick={() => setConfirming(true)}>
            إرسال
          </Button>
          {sentTo !== null ? (
            <p role="status" className="text-sm font-semibold text-tw-ok">
              تم الإرسال إلى {sentTo} عميل
            </p>
          ) : null}
        </div>
      </section>

      {confirming ? (
        <ConfirmDialog
          title="إرسال الإشعار"
          message={zone === 'all' ? 'سيصل الإشعار الآن إلى كل العملاء.' : `سيصل الإشعار الآن إلى عملاء منطقة ${zoneName ?? ''}.`}
          busy={send.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            send.mutate(
              { title: title.trim(), body: body.trim(), zoneId: zone === 'all' ? null : Number(zone) },
              {
                onSuccess: (sent) => {
                  setSentTo(sent.recipients);
                  setTitle('');
                  setBody('');
                },
                onSettled: () => setConfirming(false),
              },
            )
          }
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الإشعارات المرسلة</h2>
        {campaigns.isPending || campaigns.isError ? (
          <LoadState error={campaigns.isError ? errorMessage(campaigns.error) : undefined} onRetry={() => void campaigns.refetch()} />
        ) : campaigns.data.length === 0 ? (
          <EmptyState icon={BellRing} title="لم يتم إرسال إشعارات بعد" />
        ) : (
          <Table headers={['العنوان', 'الرسالة', 'إلى', 'عدد العملاء', 'أرسله', 'التاريخ']}>
            {campaigns.data.map((c) => (
              <tr key={c.id} className="border-t border-tw-line align-top">
                <td className="px-4 py-3 font-semibold">{c.title}</td>
                <td className="max-w-md px-4 py-3 whitespace-pre-wrap">{c.body}</td>
                <td className="px-4 py-3">{c.zone?.name ?? 'كل العملاء'}</td>
                <td className="px-4 py-3">{c.recipients}</td>
                <td className="px-4 py-3">{c.sentBy}</td>
                <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                  {when(c.createdAt)}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}

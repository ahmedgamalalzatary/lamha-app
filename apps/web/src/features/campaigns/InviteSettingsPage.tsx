'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type InviteSettings, inviteSettingsProblem } from '@tawsela/shared';
import { useRef, useState } from 'react';
import { api } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, LoadState, Switch, TextField } from '@/components/ui';

const KEY = ['admin', 'settings', 'invites'] as const;

const useInviteSettings = () => useQuery({ queryKey: KEY, queryFn: () => api.request<InviteSettings>('/admin/settings/invites') });

function useSaveInviteSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteSettings) => api.request<InviteSettings>('/admin/settings/invites', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(KEY, saved),
  });
}

type NumberField = Exclude<keyof InviteSettings, 'expires'>;
const FIELDS: { key: NumberField; label: string; days?: boolean; expiring?: boolean }[] = [
  { key: 'reward', label: 'مكافأة صاحب الدعوة (ج.م)' },
  { key: 'rewardPerOrder', label: 'أقصى استخدام في الطلب الواحد (ج.م)' },
  { key: 'friendReward', label: 'رصيد الصديق عند التسجيل (ج.م)' },
  { key: 'firstOrderDays', label: 'مدة أول طلب للصديق (يوم)', days: true },
  { key: 'monthlyCap', label: 'الحد الشهري للمكافآت (ج.م)' },
  { key: 'rewardDays', label: 'صلاحية المكافأة (يوم)', days: true, expiring: true },
  { key: 'friendDays', label: 'صلاحية رصيد الصديق (يوم)', days: true, expiring: true },
];

/**
 * التسويق والعروض › مكافآت الدعوة (contract §8.17, §11 A17) [Open: name and layout ours]: Tawsilty's
 * invite rules as settings [Owner, 2026-11-26]; the expiry is a switch [Owner].
 */
export function InviteSettingsPage() {
  const settings = useInviteSettings();
  if (settings.isPending || settings.isError) {
    return <LoadState error={settings.isError ? errorMessage(settings.error) : undefined} onRetry={() => void settings.refetch()} />;
  }
  return <InviteForm initial={settings.data} />;
}

function InviteForm({ initial }: { initial: InviteSettings }) {
  const save = useSaveInviteSettings();
  const [draft, setDraft] = useState<Record<NumberField, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, String(initial[f.key])])) as Record<NumberField, string>,
  );
  const [expires, setExpires] = useState(initial.expires);
  const [saved, setSaved] = useState(false);
  const edits = useRef(0);
  const touch = () => {
    edits.current++;
    setSaved(false);
  };

  const numbers = Object.fromEntries(FIELDS.map((f) => [f.key, draft[f.key].trim() === '' ? Number.NaN : Number(draft[f.key])])) as Record<NumberField, number>;
  const settings: InviteSettings = { ...numbers, expires };
  const ready = inviteSettingsProblem(settings) === null && FIELDS.every((f) => !f.days || Number.isInteger(numbers[f.key]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">مكافآت الدعوة</h1>
        <p className="text-sm text-tw-ink-2">
          يحصل الصديق على رصيده فور التسجيل، ويحصل صاحب الدعوة على مكافأته بعد توصيل أول طلب للصديق. رصيد الدعوة لطلبات المطاعم والمتاجر فقط.
        </p>
      </div>
      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.filter((f) => !f.expiring).map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type="number"
              min={0}
              step={f.days ? 1 : 0.01}
              value={draft[f.key]}
              onChange={(e) => {
                touch();
                setDraft((d) => ({ ...d, [f.key]: e.target.value }));
              }}
            />
          ))}
        </div>
        <Switch
          label="رصيد الدعوة ينتهي بعد مدة"
          checked={expires}
          onChange={(on) => {
            touch();
            setExpires(on);
          }}
        />
        {expires ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => f.expiring).map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                type="number"
                min={1}
                step={1}
                value={draft[f.key]}
                onChange={(e) => {
                  touch();
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                }}
              />
            ))}
          </div>
        ) : null}
      </section>
      {save.error ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button
          disabled={!ready}
          loading={save.isPending}
          className="min-w-40"
          onClick={() => {
            const sent = edits.current;
            save.mutate(settings, { onSuccess: () => setSaved(edits.current === sent) });
          }}
        >
          حفظ
        </Button>
        {saved ? (
          <p role="status" className="text-sm font-semibold text-tw-ok">
            تم حفظ التغييرات
          </p>
        ) : null}
      </div>
    </div>
  );
}

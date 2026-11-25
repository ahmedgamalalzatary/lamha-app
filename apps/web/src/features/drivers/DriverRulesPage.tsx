'use client';

import type { DriverRules, DriverSettings, WeekSchedule } from '@tawsela/shared';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, LoadState, TextField } from '@/components/ui';
import { useDriverSettings, useSaveDriverSettings } from './api';
import { isWeekReady, WeekEditor } from './WeekEditor';

/** The rules' fields, their labels and limits (the API's). */
const FIELDS: { key: keyof DriverRules; label: string; min: number; max: number }[] = [
  { key: 'startEarlyMinutes', label: 'يبدأ قبل النوبة بـ (دقيقة)', min: 0, max: 240 },
  { key: 'startLateMinutes', label: 'ويبدأ حتى بعد بدايتها بـ (دقيقة)', min: 0, max: 240 },
  { key: 'extendMinutes', label: 'مدة التمديد (دقيقة)', min: 5, max: 480 },
  { key: 'extendMax', label: 'أقصى عدد للتمديد', min: 0, max: 10 },
  { key: 'offerSeconds', label: 'مدة عرض الطلب (ثانية)', min: 10, max: 600 },
  { key: 'skipWarn', label: 'تحذير بعد تخطي (طلب متتالي)', min: 1, max: 20 },
  { key: 'skipBlock', label: 'إيقاف بعد تخطي (طلب متتالي)', min: 1, max: 20 },
  { key: 'blockMinutes', label: 'مدة الإيقاف (دقيقة)', min: 1, max: 1440 },
];

/**
 * المندوبين › نوبات العمل والقواعد (contract §10, §15.1 #5) [Open: name and layout ours]: the week
 * every delivery man without his own follows, and the shift, offer and skip numbers.
 */
export function DriverRulesPage() {
  const settings = useDriverSettings();
  if (settings.isPending || settings.isError) {
    return <LoadState error={settings.isError ? errorMessage(settings.error) : undefined} onRetry={() => void settings.refetch()} />;
  }
  return <RulesForm initial={settings.data} />;
}

type Numbers = Record<keyof DriverRules, string>;

function RulesForm({ initial }: { initial: DriverSettings }) {
  const save = useSaveDriverSettings();
  const [week, setWeek] = useState<WeekSchedule>(initial.schedule);
  const [numbers, setNumbers] = useState<Numbers>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(initial[f.key])])) as Numbers);
  const [saved, setSaved] = useState(false);
  const edits = useRef(0);
  const edited = () => {
    edits.current++;
    setSaved(false);
  };

  const valid = (f: (typeof FIELDS)[number]) => {
    const v = numbers[f.key];
    return /^\d+$/.test(v) && Number(v) >= f.min && Number(v) <= f.max;
  };
  const ready = isWeekReady(week) && FIELDS.every(valid);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">نوبات العمل والقواعد</h1>
        <p className="text-sm text-tw-ink-2">الجدول الأسبوعي لكل مندوب ليس له جدول خاص، بتوقيت القاهرة.</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">الجدول الأسبوعي</h2>
        <WeekEditor
          week={week}
          onChange={(w) => {
            edited();
            setWeek(w);
          }}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <h2 className="text-lg font-bold">القواعد</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type="number"
              min={f.min}
              max={f.max}
              step="1"
              value={numbers[f.key]}
              onChange={(e) => {
                edited();
                setNumbers((n) => ({ ...n, [f.key]: e.target.value }));
              }}
            />
          ))}
        </div>
        <p className="text-xs text-tw-ink-2">يظهر الطلب الجديد لكل المندوبين في الشفت، وإذا لم يقبله أحد يظهر مرة أخرى. لا يُحسب تخطي إلا عند الضغط على «تخطي».</p>
      </section>

      {save.error ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button
          disabled={!ready}
          loading={save.isPending}
          className="min-w-40"
          onClick={() => {
            const sent = edits.current;
            const rules = Object.fromEntries(FIELDS.map((f) => [f.key, Number(numbers[f.key])])) as unknown as DriverRules;
            save.mutate({ ...rules, schedule: week }, { onSuccess: () => setSaved(edits.current === sent) });
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

'use client';

import { type DriverRules, type DriverSettings, isSpeedLevels, SPEED_LEVELS_MAX, type WeekSchedule } from '@tawsela/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, IconButton, LoadState, TextField } from '@/components/ui';
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
type LevelDraft = { minutes: string; points: string };

function RulesForm({ initial }: { initial: DriverSettings }) {
  const save = useSaveDriverSettings();
  const [week, setWeek] = useState<WeekSchedule>(initial.schedule);
  const [numbers, setNumbers] = useState<Numbers>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(initial[f.key])])) as Numbers);
  const [levels, setLevels] = useState<LevelDraft[]>(() => initial.speedLevels.map((l) => ({ minutes: String(l.maxMinutesPerKm), points: String(l.points) })));
  const [pointValue, setPointValue] = useState(String(initial.pointValue));
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
  const speedLevels = levels.map((l) => ({ maxMinutesPerKm: l.minutes.trim() === '' ? Number.NaN : Number(l.minutes), points: l.points.trim() === '' ? Number.NaN : Number(l.points) }));
  const valueOk = /^\d+(\.\d{1,2})?$/.test(pointValue.trim()) && Number(pointValue) <= 10_000;
  const ready = isWeekReady(week) && FIELDS.every(valid) && isSpeedLevels(speedLevels) && valueOk;
  const setLevel = (i: number, change: Partial<LevelDraft>) => {
    edited();
    setLevels((all) => all.map((l, j) => (j === i ? { ...l, ...change } : l)));
  };

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

      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <h2 className="text-lg font-bold">نقاط السرعة</h2>
        <p className="text-sm text-tw-ink-2">
          من قبول الطلب حتى توصيله، مقسوماً على كيلومترات المسافة من المتجر للعميل. يأخذ المندوب نقاط أسرع مستوى وصل له، وتُصرف له نقداً.
        </p>
        {levels.map((l, i) => (
          <div key={i} className="flex items-end gap-3">
            <TextField
              label="حتى (دقيقة لكل كم)"
              type="number"
              min={0.01}
              step="0.01"
              value={l.minutes}
              onChange={(e) => setLevel(i, { minutes: e.target.value })}
              className="flex-1"
            />
            <TextField label="النقاط" type="number" min={1} step="1" value={l.points} onChange={(e) => setLevel(i, { points: e.target.value })} className="flex-1" />
            <IconButton
              label={`حذف المستوى ${i + 1}`}
              onClick={() => {
                edited();
                setLevels((all) => all.filter((_, j) => j !== i));
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        ))}
        <Button
          tone="soft"
          className="self-start"
          disabled={levels.length >= SPEED_LEVELS_MAX}
          onClick={() => {
            edited();
            setLevels((all) => [...all, { minutes: '', points: '' }]);
          }}
        >
          <Plus className="size-4" aria-hidden />
          إضافة مستوى
        </Button>
        <TextField
          label="قيمة النقطة (ج.م)"
          type="number"
          min={0}
          step="0.01"
          value={pointValue}
          onChange={(e) => {
            edited();
            setPointValue(e.target.value);
          }}
          className="max-w-xs"
        />
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
            save.mutate({ ...rules, schedule: week, speedLevels, pointValue: Number(pointValue) }, { onSuccess: () => setSaved(edits.current === sent) });
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

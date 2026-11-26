'use client';

import { earnBase, formatMoney, pointsEarned, type PointsSettings, pointsWorth } from '@tawsela/shared';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, LoadState, TextField } from '@/components/ui';
import { usePointsSettings, useSavePointsSettings } from './api';

/** The example order's items total. */
const EXAMPLE = 200;

const positive = (v: string) => v.trim() !== '' && Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v.trim());
const value = (v: string) => v.trim() !== '' && /^\d+(\.\d{1,4})?$/.test(v.trim());
const whole = (v: string) => /^\d+$/.test(v.trim());

/**
 * الإعدادات › النقاط (contract §8.16, §11 A21) [Open: name and layout ours]: what earns a point, what a
 * point pays, and the minimum to spend [Owner, 2026-11-26: two settings, not one rate].
 */
export function PointsSettingsPage() {
  const settings = usePointsSettings();
  if (settings.isPending || settings.isError) {
    return <LoadState error={settings.isError ? errorMessage(settings.error) : undefined} onRetry={() => void settings.refetch()} />;
  }
  return <PointsForm initial={settings.data} />;
}

type Draft = Record<keyof PointsSettings, string>;

function PointsForm({ initial }: { initial: PointsSettings }) {
  const save = useSavePointsSettings();
  const [draft, setDraft] = useState<Draft>({ earnEvery: String(initial.earnEvery), pointValue: String(initial.pointValue), minimum: String(initial.minimum) });
  const [saved, setSaved] = useState(false);
  const edits = useRef(0);
  const set = (k: keyof Draft, v: string) => {
    edits.current++;
    setSaved(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const ready = positive(draft.earnEvery) && value(draft.pointValue) && whole(draft.minimum);
  const rules = { earnEvery: Number(draft.earnEvery), pointValue: Number(draft.pointValue), minimum: Number(draft.minimum) };
  const earned = pointsEarned(earnBase(EXAMPLE, 0), rules.earnEvery);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">النقاط</h1>
        <p className="text-sm text-tw-ink-2">
          يكسب العميل النقاط على المنتجات فقط بعد توصيل الطلب، ولا تُحسب رسوم التوصيل ولا ما دُفع بالنقاط. النقاط لا تنتهي.
        </p>
      </div>
      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="كل كم ج.م = نقطة واحدة" type="number" min={0.01} step="0.01" value={draft.earnEvery} onChange={(e) => set('earnEvery', e.target.value)} />
          <TextField label="قيمة النقطة (ج.م)" type="number" min={0} step="0.0001" value={draft.pointValue} onChange={(e) => set('pointValue', e.target.value)} />
          <TextField label="الحد الأدنى للاستبدال (نقطة)" type="number" min={0} step="1" value={draft.minimum} onChange={(e) => set('minimum', e.target.value)} />
        </div>
        {ready ? (
          <p className="text-sm">
            مثال: طلب منتجاته {formatMoney(EXAMPLE)} يكسب {earned} نقطة، قيمتها {formatMoney(pointsWorth(earned, rules.pointValue))}.
          </p>
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
            save.mutate(rules, { onSuccess: () => setSaved(edits.current === sent) });
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

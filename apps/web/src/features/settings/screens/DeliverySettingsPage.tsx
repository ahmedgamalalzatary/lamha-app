'use client';

import { type DeliverySettings, deliveryFeeFor, formatMoney, PAYOUT_OPTIONS, type PayoutOption } from '@tawsela/shared';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, LoadState, SelectField, TextField } from '@/components/ui';
import { useDeliverySettings, useSaveDeliverySettings } from '../api/settings';
import { isMoney, isPercent, PAYOUT_LABELS } from '../payout';

/**
 * الإعدادات › رسوم التوصيل والدفع (contract §8.7, §15.1 #3 and #11) [Open: name and layout ours]:
 * the delivery fee rule for every store, and who pays whom for stores without their own option.
 */
export function DeliverySettingsPage() {
  const settings = useDeliverySettings();
  if (settings.isPending || settings.isError) {
    return <LoadState error={settings.isError ? errorMessage(settings.error) : undefined} onRetry={() => void settings.refetch()} />;
  }
  return <SettingsForm initial={settings.data} />;
}

type Draft = Record<'baseFee' | 'baseKm' | 'perKm' | 'appPercent', string> & { payoutOption: PayoutOption };

function SettingsForm({ initial }: { initial: DeliverySettings }) {
  const save = useSaveDeliverySettings();
  const [draft, setDraft] = useState<Draft>({
    baseFee: String(initial.baseFee),
    baseKm: String(initial.baseKm),
    perKm: String(initial.perKm),
    appPercent: String(initial.appPercent),
    payoutOption: initial.payoutOption,
  });
  const [saved, setSaved] = useState(false);
  const edits = useRef(0);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    edits.current++;
    setSaved(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const ready = isMoney(draft.baseFee) && isMoney(draft.baseKm) && isMoney(draft.perKm) && isPercent(draft.appPercent);
  const rule = { baseFee: Number(draft.baseFee), baseKm: Number(draft.baseKm), perKm: Number(draft.perKm) };
  const example = rule.baseKm + 1.3;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">رسوم التوصيل والدفع</h1>
        <p className="text-sm text-tw-ink-2">رسوم التوصيل لكل المتاجر، وما يدفعه المندوب للمتجر في الطلبات الكاش.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">رسوم التوصيل</h2>
          <p className="text-xs text-tw-ink-2">المسافة خط مستقيم من موقع المتجر إلى العميل، وأي جزء من الكيلو يُحسب كيلو كامل.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="الرسوم الأساسية (ج.م)" type="number" min={0} step="0.01" value={draft.baseFee} onChange={(e) => set('baseFee', e.target.value)} />
          <TextField label="تشمل أول (كم)" type="number" min={0} step="0.01" value={draft.baseKm} onChange={(e) => set('baseKm', e.target.value)} />
          <TextField label="لكل كيلو زيادة (ج.م)" type="number" min={0} step="0.01" value={draft.perKm} onChange={(e) => set('perKm', e.target.value)} />
        </div>
        {ready ? (
          <p className="text-sm">
            مثال: {example.toFixed(1)} كم = {formatMoney(deliveryFeeFor(example, rule))}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">الدفع للمتجر</h2>
          <p className="text-xs text-tw-ink-2">يأخذ المندوب رسوم التوصيل دائماً. ينطبق هذا على كل متجر ليس له إعداد خاص.</p>
        </div>
        <SelectField
          label="ما يدفعه المندوب للمتجر"
          value={draft.payoutOption}
          options={PAYOUT_OPTIONS.map((v) => ({ value: v, label: PAYOUT_LABELS[v] }))}
          onChange={(v) => set('payoutOption', v)}
        />
        <TextField label="نسبة التطبيق من المنتجات (%)" type="number" min={0} max={100} step="0.01" value={draft.appPercent} onChange={(e) => set('appPercent', e.target.value)} />
      </section>

      {save.error ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button
          disabled={!ready}
          loading={save.isPending}
          className="min-w-40"
          onClick={() => {
            const sent = edits.current;
            save.mutate({ ...rule, payoutOption: draft.payoutOption, appPercent: Number(draft.appPercent) }, { onSuccess: () => setSaved(edits.current === sent) });
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

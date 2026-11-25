'use client';

import type { SupportPhone } from '@tawsela/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, ErrorLine, IconButton, LoadState, TextField } from '@/components/ui';
import { useSaveSupportPhones, useSupportPhones } from './api';

const PHONE = /^\+?\d{5,15}$/;

/**
 * الإعدادات › أرقام التواصل (contract §8.14) [Open: name and layout ours]: the numbers the app's
 * "تواصل معنا" sheet lists, in order ("هاتف 1  01021846434") [Owner, 2026-11-25].
 */
export function SupportPhonesPage() {
  const phones = useSupportPhones();
  if (phones.isPending || phones.isError) {
    return <LoadState error={phones.isError ? errorMessage(phones.error) : undefined} onRetry={() => void phones.refetch()} />;
  }
  return <PhonesForm initial={phones.data} />;
}

function PhonesForm({ initial }: { initial: SupportPhone[] }) {
  const save = useSaveSupportPhones();
  const [rows, setRows] = useState<SupportPhone[]>(initial);
  const [saved, setSaved] = useState(false);
  const edits = useRef(0);
  const change = (next: SupportPhone[]) => {
    edits.current++;
    setSaved(false);
    setRows(next);
  };
  const ready = rows.every((r) => r.label.trim() && PHONE.test(r.phone.trim()));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">أرقام التواصل</h1>
        <p className="text-sm text-tw-ink-2">تظهر في التطبيق عند الضغط على «التواصل معنا».</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-tw-ink-2">لا توجد أرقام بعد.</p> : null}
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-3">
          <TextField
            label={`الاسم ${i + 1}`}
            placeholder="هاتف 1"
            maxLength={40}
            value={r.label}
            onChange={(e) => change(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            className="flex-1"
          />
          <TextField
            label={`الرقم ${i + 1}`}
            dir="ltr"
            inputMode="tel"
            maxLength={16}
            value={r.phone}
            onChange={(e) => change(rows.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))}
            className="flex-1"
          />
          <IconButton label={`حذف الرقم ${i + 1}`} onClick={() => change(rows.filter((_, j) => j !== i))}>
            <Trash2 className="size-5 text-tw-danger" aria-hidden />
          </IconButton>
        </div>
      ))}
      <div>
        <Button tone="soft" disabled={rows.length >= 10} onClick={() => change([...rows, { label: '', phone: '' }])}>
          <Plus className="size-4" aria-hidden />
          إضافة رقم
        </Button>
      </div>
      {save.error ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button
          disabled={!ready}
          loading={save.isPending}
          className="min-w-40"
          onClick={() => {
            const sent = edits.current;
            save.mutate(
              rows.map((r) => ({ label: r.label.trim(), phone: r.phone.trim() })),
              { onSuccess: () => setSaved(edits.current === sent) },
            );
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

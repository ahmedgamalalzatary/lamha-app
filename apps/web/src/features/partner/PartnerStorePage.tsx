'use client';

import { isTimeOfDay, type PartnerStore, type PartnerStoreInput } from '@tawsela/shared';
import { useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { ImageField, useUploading } from '@/components/ImageField';
import { Button, ErrorLine, LoadState, Switch, TextField } from '@/components/ui';
import { usePartnerStore, useUpdatePartnerStore } from './api';

/**
 * /partner/store (contract §11.1 المتجر): only what a partner may change: opening hours, closed now
 * and the cover. The fee, minimum order and the rest stay with the admin. [Open] Not captured; it
 * uses the admin store form's fields.
 */
export function PartnerStorePage() {
  const store = usePartnerStore();
  if (store.isPending || store.isError) {
    return <LoadState error={store.isError ? errorMessage(store.error) : undefined} onRetry={() => void store.refetch()} />;
  }
  return <StoreForm key={store.data.id} store={store.data} />;
}

function StoreForm({ store }: { store: PartnerStore }) {
  const update = useUpdatePartnerStore();
  const upload = useUploading();
  const [draft, setDraft] = useState<PartnerStoreInput>({ opensAt: store.opensAt, closesAt: store.closesAt, closedNow: store.closedNow, cover: store.cover ?? null });
  // Editing during a save keeps the save running (one at a time); "تم حفظ التغييرات" shows only
  // when nothing changed since that save was sent.
  const edits = useRef(0);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof PartnerStoreInput>(field: K, value: PartnerStoreInput[K]) => {
    edits.current++;
    setSaved(false);
    setDraft((d) => ({ ...d, [field]: value }));
  };
  const ready = isTimeOfDay(draft.opensAt) && isTimeOfDay(draft.closesAt) && !upload.uploading;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{store.name}</h1>
      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <div>
          <h2 className="font-bold">المواعيد</h2>
          <p className="text-sm text-tw-ink-2">بتوقيت القاهرة. إذا كان الإغلاق قبل الفتح فالمواعيد تمتد بعد منتصف الليل.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="يفتح الساعة" type="time" value={draft.opensAt} onChange={(e) => set('opensAt', e.target.value)} />
          <TextField label="يغلق الساعة" type="time" value={draft.closesAt} onChange={(e) => set('closesAt', e.target.value)} />
        </div>
        <Switch label="مغلق الآن" checked={draft.closedNow} onChange={(v) => set('closedNow', v)} />
      </section>
      <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
        <ImageField label="صورة الغلاف" value={draft.cover} onChange={(v) => set('cover', v)} onBusyChange={upload.onBusyChange} />
      </section>
      {update.error ? <ErrorLine>{errorMessage(update.error)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button
          disabled={!ready}
          loading={update.isPending}
          onClick={() => {
            const sent = edits.current;
            update.mutate(draft, { onSuccess: () => setSaved(edits.current === sent) });
          }}
          className="min-w-40"
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

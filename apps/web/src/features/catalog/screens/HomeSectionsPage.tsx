'use client';

import { type AdminHomeSection, CATALOG } from '@tawsela/shared';
import { ArrowDown, ArrowUp, Palette, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { ImageField, useUploading } from '@/components/ImageField';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, SelectField, TextField } from '@/components/ui';
import { useDeleteHomeSection, useHomeSections, useOrderHomeSections, useSaveHomeSection, useStores } from '../api/catalog';
import { SortableList } from '../components/SortableList';

const LIST = 'أقسام الرئيسية';

/**
 * المنتجات والكتالوج › أقسام الرئيسية الملونة (L1 #2, the lamha demo's "الأكثر طلباً 🔥" bands [Client,
 * 2026-11-28]): each section's title, round picture, colours and stores in order; the sections' order is the
 * app's. A section whose stores are all hidden does not show in the app.
 */
export function HomeSectionsPage() {
  const sections = useHomeSections();
  const stores = useStores();
  const order = useOrderHomeSections();
  const remove = useDeleteHomeSection();
  const [editing, setEditing] = useState<AdminHomeSection | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminHomeSection | null>(null);
  const [error, setError] = useState<string>();
  const names = (ids: number[]) => ids.map((id) => stores.data?.find((s) => s.id === id)?.name ?? `#${id}`).join('، ');

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أقسام الرئيسية الملونة</h1>
          <p className="text-sm text-tw-ink-2">أشرطة ملونة في الشاشة الرئيسية للتطبيق، كل شريط بعنوانه ومتاجره، بنفس الترتيب.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة قسم
        </Button>
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {sections.isPending || sections.isError ? (
        <LoadState error={sections.isError ? errorMessage(sections.error) : undefined} onRetry={() => void sections.refetch()} />
      ) : sections.data.length === 0 ? (
        <EmptyState icon={Palette} title="لا توجد أقسام" />
      ) : (
        <SortableList
          label={LIST}
          items={sections.data}
          busy={order.isPending}
          render={(s) => (
            <div className="flex items-center gap-3">
              <span aria-hidden className="size-8 shrink-0 rounded-full ring-1 ring-tw-line" style={{ background: s.background }} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-semibold">{s.title}</p>
                <p className="truncate text-xs text-tw-ink-2">{names(s.storeIds)}</p>
              </div>
            </div>
          )}
          onMove={(ids) => {
            setError(undefined);
            order.mutate(ids, { onError: (e) => setError(errorMessage(e)) });
          }}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}
      {editing ? <SectionDialog section={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف القسم"
          message={`سيُحذف قسم "${deleting.title}" من الشاشة الرئيسية.`}
          busy={remove.isPending}
          onConfirm={() => {
            setError(undefined);
            remove.mutate(deleting.id, { onError: (e) => setError(errorMessage(e)), onSettled: () => setDeleting(null) });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

function SectionDialog({ section, onClose }: { section?: AdminHomeSection; onClose: () => void }) {
  const save = useSaveHomeSection();
  const stores = useStores();
  const upload = useUploading();
  const [title, setTitle] = useState(section?.title ?? '');
  const [image, setImage] = useState<string | null>(section?.image ?? null);
  const [background, setBackground] = useState(section?.background ?? '#E8A33D');
  const [ink, setInk] = useState(section?.ink ?? '#3A1E00');
  const [storeIds, setStoreIds] = useState<number[]>(section?.storeIds ?? []);
  const nameOf = (id: number) => stores.data?.find((s) => s.id === id)?.name ?? `#${id}`;
  const left = (stores.data ?? []).filter((s) => !storeIds.includes(s.id));
  const full = storeIds.length >= CATALOG.sectionMaxStores;
  const ready = title.trim() !== '' && storeIds.length > 0 && !upload.uploading;

  const move = (i: number, by: -1 | 1) =>
    setStoreIds((ids) => {
      const next = [...ids];
      [next[i], next[i + by]] = [next[i + by]!, next[i]!];
      return next;
    });

  const submit = () =>
    save.mutate(
      { id: section?.id, title: title.trim(), image, background: background.toUpperCase(), ink: ink.toUpperCase(), storeIds },
      { onSuccess: onClose },
    );

  return (
    <Dialog title={section ? 'تعديل قسم' : 'إضافة قسم'} onClose={onClose}>
      <TextField label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={CATALOG.nameMaxLength} placeholder="الأكثر طلباً 🔥" autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="لون القسم" type="color" value={background} onInput={(e) => setBackground(e.currentTarget.value)} onChange={(e) => setBackground(e.target.value)} />
        <TextField label="لون العنوان" type="color" value={ink} onInput={(e) => setInk(e.currentTarget.value)} onChange={(e) => setInk(e.target.value)} />
      </div>
      <p className="rounded-xl px-4 py-3 text-lg font-bold" style={{ background, color: ink }} aria-hidden>
        {title || 'عنوان القسم'}
      </p>
      <ImageField label="الصورة المستديرة (اختياري)" value={image} onChange={setImage} onBusyChange={upload.onBusyChange} />
      {stores.isError ? (
        <div className="flex items-center justify-between gap-3">
          <ErrorLine>{errorMessage(stores.error)}</ErrorLine>
          <Button tone="soft" loading={stores.isFetching} onClick={() => void stores.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <SelectField<string>
          label="إضافة متجر"
          value=""
          options={[{ value: '', label: full ? `الحد ${CATALOG.sectionMaxStores} متجراً` : 'اختر متجراً' }, ...(full ? [] : left.map((s) => ({ value: String(s.id), label: s.name })))]}
          onChange={(v) => v && setStoreIds((ids) => [...ids, Number(v)])}
        />
      )}
      {storeIds.length ? (
        <ol aria-label="متاجر القسم" className="flex flex-col divide-y divide-tw-line rounded-xl border border-tw-line">
          {storeIds.map((id, i) => (
            <li key={id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-5 text-xs text-tw-ink-2">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium">{nameOf(id)}</span>
              <IconButton label={`لأعلى: ${nameOf(id)}`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" aria-hidden />
              </IconButton>
              <IconButton label={`لأسفل: ${nameOf(id)}`} disabled={i === storeIds.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-4" aria-hidden />
              </IconButton>
              <IconButton label={`إزالة: ${nameOf(id)}`} onClick={() => setStoreIds((ids) => ids.filter((x) => x !== id))}>
                <X className="size-4" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ol>
      ) : null}
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions ready={ready} busy={save.isPending} onSave={submit} onClose={onClose} />
    </Dialog>
  );
}

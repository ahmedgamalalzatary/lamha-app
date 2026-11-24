'use client';

import { CATALOG, HOME_TILE_ROWS, type HomeTile, type TileRow, VERTICALS, type Vertical, verticalLabel } from '@tawsela/shared';
import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { ImageField, useUploading } from '@/components/ImageField';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, LoadState, Pill, SelectField, TextField } from '@/components/ui';
import { useDeleteHomeTile, useHomeTiles, useOrderHomeTiles, useSaveHomeTile, useStores } from './api';
import { SortableList } from './SortableList';

const ROW_LABELS: Record<TileRow, string> = { fixed: 'الصف الأول (ثابت)', scroll: 'الصف الثاني (يتحرك أفقياً)' };

/**
 * المنتجات والكتالوج › مربعات الرئيسية (contract §8.2, §1.1 A12): the home screen's two rows of
 * tiles, their images, badges and order [Client]. A tile opens a vertical or one pinned store.
 * [Open] Not captured from Tawsilty's admin; the name and layout are ours.
 */
export function HomeTilesPage() {
  const tiles = useHomeTiles();
  const stores = useStores();
  const order = useOrderHomeTiles();
  const remove = useDeleteHomeTile();
  const [editing, setEditing] = useState<HomeTile | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HomeTile | null>(null);
  const [error, setError] = useState<string>();
  const storeName = (id: number | null) => stores.data?.find((s) => s.id === id)?.name ?? '';

  /** Moving inside one row: send the full order, the other row unchanged. */
  const reorder = (row: TileRow, rowIds: number[]) => {
    const all = tiles.data!;
    const ids = HOME_TILE_ROWS.flatMap((r) => (r === row ? rowIds : all.filter((t) => t.row === r).map((t) => t.id)));
    setError(undefined);
    order.mutate(ids, { onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مربعات الرئيسية</h1>
          <p className="text-sm text-tw-ink-2">المربعات في أعلى الشاشة الرئيسية للتطبيق، بنفس الترتيب.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة مربع
        </Button>
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {tiles.isPending || tiles.isError ? (
        <LoadState error={tiles.isError ? errorMessage(tiles.error) : undefined} onRetry={() => void tiles.refetch()} />
      ) : tiles.data.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="لا توجد مربعات" />
      ) : (
        HOME_TILE_ROWS.map((row) => {
          const items = tiles.data.filter((t) => t.row === row);
          if (!items.length) return null;
          return (
            <section key={row} className="flex flex-col gap-2">
              <h2 className="font-bold">{ROW_LABELS[row]}</h2>
              <SortableList
                label={ROW_LABELS[row]}
                items={items}
                busy={order.isPending}
                render={(t) => (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{t.label}</p>
                      {t.badge ? <Pill tone="muted">{t.badge}</Pill> : null}
                    </div>
                    <p className="text-xs text-tw-ink-2">{t.targetVertical ? `يفتح: ${verticalLabel(t.targetVertical)}` : `يفتح متجر: ${storeName(t.targetStoreId)}`}</p>
                  </div>
                )}
                onMove={(ids) => reorder(row, ids)}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </section>
          );
        })
      )}
      {editing ? <TileDialog tile={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف المربع"
          message={`سيُحذف مربع "${deleting.label}" من الشاشة الرئيسية.`}
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

type Target = Vertical | 'store';

function TileDialog({ tile, onClose }: { tile?: HomeTile; onClose: () => void }) {
  const save = useSaveHomeTile();
  const stores = useStores();
  const [label, setLabel] = useState(tile?.label ?? '');
  const [badge, setBadge] = useState(tile?.badge ?? '');
  const [image, setImage] = useState<string | null>(tile?.image ?? null);
  const upload = useUploading();
  const [row, setRow] = useState<TileRow>(tile?.row ?? 'fixed');
  const [target, setTarget] = useState<Target>(tile?.targetVertical ?? (tile ? 'store' : 'restaurant'));
  const [storeId, setStoreId] = useState(String(tile?.targetStoreId ?? ''));
  const pickedStore = target === 'store' ? (storeId || String(stores.data?.[0]?.id ?? '')) : '';
  const ready = label.trim() !== '' && (target !== 'store' || pickedStore !== '');

  const submit = () =>
    save.mutate(
      {
        id: tile?.id,
        label: label.trim(),
        badge: badge.trim() || null,
        image,
        row,
        targetVertical: target === 'store' ? null : target,
        targetStoreId: target === 'store' ? Number(pickedStore) : null,
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog title={tile ? 'تعديل مربع' : 'إضافة مربع'} onClose={onClose}>
      <TextField label="الاسم" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={CATALOG.nameMaxLength} autoFocus />
      <TextField label="شارة (اختياري)" value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={CATALOG.badgeMaxLength} placeholder="سريع" />
      <SelectField label="الصف" value={row} options={HOME_TILE_ROWS.map((r) => ({ value: r, label: ROW_LABELS[r] }))} onChange={setRow} />
      <SelectField<Target>
        label="يفتح"
        value={target}
        options={[...VERTICALS.map((v) => ({ value: v as Target, label: verticalLabel(v) })), { value: 'store', label: 'متجر واحد' }]}
        onChange={setTarget}
      />
      {target !== 'store' ? null : stores.isError ? (
        // The stores list failed: say why and offer a retry; the vertical targets still work.
        <div className="flex items-center justify-between gap-3">
          <ErrorLine>{errorMessage(stores.error)}</ErrorLine>
          <Button tone="soft" loading={stores.isFetching} onClick={() => void stores.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <SelectField label="المتجر" value={pickedStore} options={(stores.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))} onChange={setStoreId} />
      )}
      <ImageField label="الصورة" value={image} onChange={setImage} onBusyChange={upload.onBusyChange} />
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions ready={ready && !upload.uploading} busy={save.isPending} onSave={submit} onClose={onClose} />
    </Dialog>
  );
}

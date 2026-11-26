'use client';

import { CATALOG, type Cuisine } from '@tawsela/shared';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { ImageField, useUploading } from '@/components/ImageField';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, LoadState, TextField } from '@/components/ui';
import { useCuisines, useDeleteCuisine, useOrderCuisines, useSaveCuisine } from '../api/catalog';
import { SortableList } from '../components/SortableList';

/**
 * المنتجات والكتالوج › أنواع الأكل (contract §8.3, §1.1 A12): the cuisine circles on the restaurants
 * list (بروست · اكل صحى · باستا…), in order. [Open] Not captured from Tawsilty's admin; the name is ours.
 */
export function CuisinesPage() {
  const cuisines = useCuisines();
  const order = useOrderCuisines();
  const remove = useDeleteCuisine();
  const [editing, setEditing] = useState<Cuisine | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Cuisine | null>(null);
  const [error, setError] = useState<string>();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أنواع الأكل</h1>
          <p className="text-sm text-tw-ink-2">الدوائر أعلى قائمة المطاعم، بنفس الترتيب.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة
        </Button>
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {cuisines.isPending || cuisines.isError ? (
        <LoadState error={cuisines.isError ? errorMessage(cuisines.error) : undefined} onRetry={() => void cuisines.refetch()} />
      ) : cuisines.data.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="لا توجد أنواع" />
      ) : (
        <SortableList
          label="أنواع الأكل"
          items={cuisines.data}
          busy={order.isPending}
          render={(c) => <p className="font-semibold">{c.name}</p>}
          onMove={(ids) => {
            setError(undefined);
            order.mutate(ids, { onError: (e) => setError(errorMessage(e)) });
          }}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}
      {editing ? <CuisineDialog cuisine={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف النوع"
          message={`سيُحذف "${deleting.name}" ويُزال من المطاعم المرتبطة به.`}
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

function CuisineDialog({ cuisine, onClose }: { cuisine?: Cuisine; onClose: () => void }) {
  const save = useSaveCuisine();
  const [name, setName] = useState(cuisine?.name ?? '');
  const [image, setImage] = useState<string | null>(cuisine?.image ?? null);
  const upload = useUploading();
  return (
    <Dialog title={cuisine ? 'تعديل نوع' : 'إضافة نوع'} onClose={onClose}>
      <TextField label="الاسم" value={name} onChange={(e) => setName(e.target.value)} maxLength={CATALOG.nameMaxLength} autoFocus />
      <ImageField label="الصورة" value={image} onChange={setImage} onBusyChange={upload.onBusyChange} />
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions
        ready={name.trim() !== '' && !upload.uploading}
        busy={save.isPending}
        onSave={() => save.mutate({ id: cuisine?.id, name: name.trim(), image }, { onSuccess: onClose })}
        onClose={onClose}
      />
    </Dialog>
  );
}

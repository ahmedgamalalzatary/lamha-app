'use client';

import { type AdminBanner, type BannerOpens, type BannerPlace } from '@tawsela/shared';
import { GalleryHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ImageField, useUploading } from '@/components/ImageField';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, SelectField, Switch, Table, TextField } from '@/components/ui';
import { useStores } from '@/features/catalog/api/catalog';
import { useBanners, useDeleteBanner, useSaveBanner } from '../api/offers';

const PLACE_LABEL: Record<BannerPlace, string> = { carousel: 'العروض المتحركة', rail: 'شريط منتجات المتجر' };
const OPENS_LABEL: Record<BannerOpens, string> = { store: 'صفحة المتجر', products: 'كل منتجات المتجر' };

/**
 * التسويق والعروض › البنرات (contract §8.2, §11 A14) [Client; layout ours]: the home carousel's slides,
 * each opening its store, and rails (the mart banner) over a row of the store's products. Lower
 * ترتيب comes first.
 */
export function BannersPage() {
  const banners = useBanners();
  const save = useSaveBanner();
  const remove = useDeleteBanner();
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">البنرات</h1>
        <Button onClick={() => setEditing('new')}>إضافة بنر</Button>
      </div>

      {banners.isPending || banners.isError ? (
        <LoadState error={banners.isError ? errorMessage(banners.error) : undefined} onRetry={() => void banners.refetch()} />
      ) : banners.data.length === 0 ? (
        <EmptyState icon={GalleryHorizontal} title="لا توجد بنرات بعد" />
      ) : (
        <Table headers={['الصورة', 'المتجر', 'المكان', 'يفتح', 'الترتيب', 'مفعّل', '']}>
          {banners.data.map((b) => (
            <tr key={b.id} className="border-t border-tw-line">
              <td className="px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded image from the API */}
                <img src={mediaUrl(b.image) ?? ''} alt="" className="h-14 w-28 rounded-lg object-cover" />
              </td>
              <td className="px-4 py-3 font-semibold">{b.storeName}</td>
              <td className="px-4 py-3">{PLACE_LABEL[b.place]}</td>
              <td className="px-4 py-3">{OPENS_LABEL[b.opens]}</td>
              <td className="px-4 py-3">{b.sortOrder}</td>
              <td className="px-4 py-3">
                <Switch label={`تفعيل بنر ${b.storeName}`} checked={b.active} disabled={save.isPending} onChange={(active) => save.mutate({ id: b.id, active })} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <IconButton label={`تعديل بنر ${b.storeName}`} onClick={() => setEditing(b)}>
                    <Pencil className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label={`حذف بنر ${b.storeName}`} onClick={() => setDeleting(b)}>
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {editing ? <BannerDialog banner={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف البنر"
          message={`سيختفي بنر ${deleting.storeName} من الرئيسية.`}
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
        />
      ) : null}
    </div>
  );
}

function BannerDialog({ banner, onClose }: { banner: AdminBanner | null; onClose: () => void }) {
  const stores = useStores();
  const save = useSaveBanner();
  const upload = useUploading();
  const [image, setImage] = useState<string | null>(banner?.image ?? null);
  const [storeId, setStoreId] = useState(banner ? String(banner.storeId) : '');
  const [place, setPlace] = useState<BannerPlace>(banner?.place ?? 'carousel');
  const [opens, setOpens] = useState<BannerOpens>(banner?.opens ?? 'store');
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0));
  const ready = !!image && storeId !== '' && Number.isInteger(Number(sortOrder)) && !upload.uploading;

  // A rail opens the store's products as one grid, as Tawsilty's mart banner does.
  const choosePlace = (next: BannerPlace) => {
    setPlace(next);
    setOpens(next === 'rail' ? 'products' : 'store');
  };

  return (
    <Dialog title={banner ? `تعديل بنر ${banner.storeName}` : 'إضافة بنر'} onClose={onClose}>
      <ImageField label="صورة البنر" value={image} onChange={setImage} onBusyChange={upload.onBusyChange} />
      <SelectField
        label="المتجر"
        value={storeId}
        options={[{ value: '', label: 'اختر متجراً' }, ...(stores.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]}
        onChange={setStoreId}
      />
      <SelectField label="المكان" value={place} options={(['carousel', 'rail'] as const).map((p) => ({ value: p, label: PLACE_LABEL[p] }))} onChange={choosePlace} />
      <SelectField label="يفتح" value={opens} options={(['store', 'products'] as const).map((o) => ({ value: o, label: OPENS_LABEL[o] }))} onChange={setOpens} />
      <TextField label="الترتيب" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <DialogActions
        ready={ready}
        busy={save.isPending}
        onSave={() =>
          save.mutate(
            { id: banner?.id, image: image!, storeId: Number(storeId), place, opens, sortOrder: Number(sortOrder), active: banner?.active ?? true },
            { onSuccess: onClose },
          )
        }
        onClose={onClose}
      />
    </Dialog>
  );
}

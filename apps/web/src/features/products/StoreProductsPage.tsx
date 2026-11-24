'use client';

import { CATALOG, type Category, formatMoney, type Product } from '@tawsela/shared';
import { ArrowDown, ArrowUp, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { ImageField } from '@/components/ImageField';
import { Button, ConfirmDialog, Dialog, DialogActions, EmptyState, ErrorLine, IconButton, LoadState, SelectField, Switch, Table, TextField } from '@/components/ui';
import {
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useDeleteCategory,
  useDeleteProduct,
  useOrderCategories,
  useProducts,
  useStores,
  useUpdateCategory,
  useUpdateProduct,
} from '../catalog/api';
import { draftOf, draftReady, draftToInput, ProductChoicesFields } from './ProductChoicesFields';

/**
 * المنتجات والكتالوج › منتجات الموردين (contract §11, §1.1 A10): pick a store, then its categories
 * (in menu order) and its products. [Open] Tawsilty's products page is not captured; it uses the
 * orders table's look.
 */
export function StoreProductsPage({ initialStoreId }: { initialStoreId?: number }) {
  const stores = useStores();
  const [picked, setPicked] = useState<number | undefined>(initialStoreId);
  const storeId = picked ?? stores.data?.[0]?.id;

  if (stores.isPending || stores.isError) {
    return <LoadState error={stores.isError ? errorMessage(stores.error) : undefined} onRetry={() => void stores.refetch()} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">منتجات الموردين</h1>
      {stores.data.length === 0 || storeId === undefined ? (
        <EmptyState icon={Package} title="لا توجد متاجر" message="أضف متجراً من صفحة الموردين أولاً" />
      ) : (
        <>
          <div className="max-w-sm">
            <SelectField
              label="المتجر"
              value={String(storeId)}
              options={stores.data.map((s) => ({ value: String(s.id), label: s.name }))}
              onChange={(v) => setPicked(Number(v))}
            />
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[21rem_1fr]">
            <Categories key={`c${storeId}`} storeId={storeId} />
            <Products key={`p${storeId}`} storeId={storeId} />
          </div>
        </>
      )}
    </div>
  );
}

function Categories({ storeId }: { storeId: number }) {
  const categories = useCategories(storeId);
  const order = useOrderCategories();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [error, setError] = useState<string>();

  const move = (index: number, by: -1 | 1) => {
    const ids = categories.data!.map((c) => c.id);
    [ids[index], ids[index + by]] = [ids[index + by]!, ids[index]!];
    setError(undefined);
    order.mutate({ storeId, ids }, { onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-tw-line p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">الأقسام</h2>
        <Button tone="soft" className="h-9 px-4" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة قسم
        </Button>
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {categories.isPending || categories.isError ? (
        <LoadState error={categories.isError ? errorMessage(categories.error) : undefined} onRetry={() => void categories.refetch()} />
      ) : (
        <ul aria-label="الأقسام" className="flex flex-col">
          {categories.data.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 border-t border-tw-line py-2 first:border-t-0">
              <div className={`min-w-0 flex-1 ${c.parentId ? 'ps-4' : ''}`}>
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-tw-ink-2">{c.productCount} منتج</p>
                {c.parentId ? (
                  <p className="text-xs text-tw-ink-2">قسم فرعي من {categories.data.find((p) => p.id === c.parentId)?.name}</p>
                ) : null}
              </div>
              <IconButton label="تحريك لأعلى" disabled={i === 0 || order.isPending} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" aria-hidden />
              </IconButton>
              <IconButton label="تحريك لأسفل" disabled={i === categories.data.length - 1 || order.isPending} onClick={() => move(i, 1)}>
                <ArrowDown className="size-4" aria-hidden />
              </IconButton>
              <IconButton label="تعديل القسم" onClick={() => setEditing(c)}>
                <Pencil className="size-4" aria-hidden />
              </IconButton>
              <IconButton label="حذف القسم" onClick={() => setDeleting(c)}>
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <CategoryDialog storeId={storeId} categories={categories.data ?? []} category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف القسم"
          message={`سيُحذف قسم "${deleting.name}".`}
          busy={remove.isPending}
          onConfirm={() => {
            setError(undefined);
            remove.mutate(deleting.id, { onError: (e) => setError(errorMessage(e)), onSettled: () => setDeleting(null) });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}

/** No main category: the category is a main one. */
const MAIN = '';

function CategoryDialog({ storeId, categories, category, onClose }: { storeId: number; categories: Category[]; category?: Category; onClose: () => void }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [name, setName] = useState(category?.name ?? '');
  const [image, setImage] = useState<string | null>(category?.image ?? null);
  const [parent, setParent] = useState(category?.parentId ? String(category.parentId) : MAIN);
  // Sub-categories are one level deep: only main categories can hold them, and one that holds some stays main.
  const mains = categories.filter((c) => c.parentId === null && c.id !== category?.id);
  const holdsSubcategories = category ? categories.some((c) => c.parentId === category.id) : false;
  const save = () => {
    const done = { onSuccess: onClose };
    const parentId = parent === MAIN ? null : Number(parent);
    if (category) update.mutate({ id: category.id, name: name.trim(), image, parentId }, done);
    else create.mutate({ storeId, name: name.trim(), parentId, ...(image ? { image } : {}) }, done);
  };
  const failed = create.error ?? update.error;
  return (
    <Dialog title={category ? 'تعديل القسم' : 'إضافة قسم'} onClose={onClose}>
      <TextField label="اسم القسم" value={name} onChange={(e) => setName(e.target.value)} maxLength={CATALOG.nameMaxLength} autoFocus />
      {holdsSubcategories || mains.length === 0 ? null : (
        <SelectField
          label="القسم الرئيسي"
          value={parent}
          options={[{ value: MAIN, label: 'بدون (قسم رئيسي)' }, ...mains.map((c) => ({ value: String(c.id), label: c.name }))]}
          onChange={setParent}
        />
      )}
      <ImageField label="صورة القسم (للماركت)" value={image} onChange={setImage} />
      {failed ? <ErrorLine>{errorMessage(failed)}</ErrorLine> : null}
      <DialogActions ready={name.trim() !== ''} busy={create.isPending || update.isPending} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

function Products({ storeId }: { storeId: number }) {
  const categories = useCategories(storeId);
  const products = useProducts(storeId);
  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [error, setError] = useState<string>();
  const categoryName = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const noCategories = categories.data?.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">المنتجات</h2>
        <Button disabled={!categories.data || noCategories} onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة منتج
        </Button>
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {products.isPending || products.isError ? (
        <LoadState error={products.isError ? errorMessage(products.error) : undefined} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد منتجات" message={noCategories ? 'أضف قسماً أولاً، ثم أضف منتجاته' : undefined} />
      ) : (
        <Table headers={['المنتج', 'القسم', 'السعر', 'متاح', 'العمليات']}>
          {products.data.map((p) => (
            <tr key={p.id} className="border-t border-tw-line">
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-tw-input">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={mediaUrl(p.image)} alt="" className="size-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.unit ? <p className="text-xs text-tw-ink-2">{p.unit}</p> : null}
                    {p.optionGroups.length || p.ingredients.length ? (
                      <p className="text-xs text-tw-ink-2">
                        {p.optionGroups.length} مجموعة · {p.ingredients.length} مكوّن
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{categoryName(p.categoryId)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatMoney(p.price)}</td>
              <td className="px-4 py-3">
                <Switch
                  label="متاح"
                  checked={p.active}
                  disabled={update.isPending}
                  onChange={(active) => {
                    setError(undefined);
                    update.mutate({ id: p.id, active }, { onError: (e) => setError(errorMessage(e)) });
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <IconButton label="تعديل" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton label="حذف" onClick={() => setDeleting(p)}>
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && categories.data?.length ? (
        <ProductDialog storeId={storeId} categories={categories.data} product={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="حذف المنتج"
          message={`سيُحذف "${deleting.name}" من المتجر.`}
          busy={remove.isPending}
          onConfirm={() => {
            setError(undefined);
            remove.mutate(deleting.id, { onError: (e) => setError(errorMessage(e)), onSettled: () => setDeleting(null) });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}

const PRICE = /^\d+(\.\d{1,2})?$/;

function ProductDialog({ storeId, categories, product, onClose }: { storeId: number; categories: Category[]; product?: Product; onClose: () => void }) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(String(product?.categoryId ?? categories[0]!.id));
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [active, setActive] = useState(product?.active ?? true);
  const [choices, setChoices] = useState(() => draftOf(product));
  const ready = name.trim() !== '' && PRICE.test(price.trim()) && draftReady(choices);

  const save = () => {
    const fields = {
      categoryId: Number(categoryId),
      name: name.trim(),
      price: Number(price),
      unit: unit.trim() || null,
      description: description.trim() || null,
      image,
      active,
      ...draftToInput(choices),
    };
    if (product) update.mutate({ id: product.id, ...fields }, { onSuccess: onClose });
    else create.mutate({ storeId, ...fields }, { onSuccess: onClose });
  };
  const failed = create.error ?? update.error;

  return (
    <Dialog title={product ? 'تعديل منتج' : 'إضافة منتج'} onClose={onClose}>
      <TextField label="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} maxLength={CATALOG.nameMaxLength} autoFocus />
      <SelectField label="القسم" value={categoryId} options={categories.map((c) => ({ value: String(c.id), label: c.name }))} onChange={setCategoryId} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="السعر (ج.م)" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        <TextField label="الوحدة (اختياري)" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={CATALOG.unitMaxLength} placeholder="كيلو" />
      </div>
      <TextField label="الوصف (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={CATALOG.descriptionMaxLength} />
      <ImageField label="صورة المنتج" value={image} onChange={setImage} />
      <Switch label="متاح للعملاء" checked={active} onChange={setActive} />
      <ProductChoicesFields draft={choices} onChange={setChoices} />
      {failed ? <ErrorLine>{errorMessage(failed)}</ErrorLine> : null}
      <DialogActions ready={ready} busy={create.isPending || update.isPending} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

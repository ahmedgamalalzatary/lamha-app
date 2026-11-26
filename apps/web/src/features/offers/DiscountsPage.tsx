'use client';

import { formatMoney, type PaidBy, type Product } from '@tawsela/shared';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, Dialog, DialogActions, EmptyState, ErrorLine, LoadState, SelectField, Table, TextField } from '@/components/ui';
import { useStores } from '@/features/catalog/api';
import { useSetDiscount, useStoreProducts } from './api';
import { PAID_BY_LABEL } from './offer-text';

/**
 * التسويق والعروض › خصومات المنتجات (contract §8.4, §11 A15) [Layout ours]: a product's price before its
 * discount, struck through in the app with "وفر …", and who pays the difference [Owner, 2026-11-26].
 * The admin's only: a store's own product form has no discount.
 */
export function DiscountsPage() {
  const stores = useStores();
  const [storeId, setStoreId] = useState('');
  const products = useStoreProducts(storeId ? Number(storeId) : undefined);
  const discount = useSetDiscount();
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">خصومات المنتجات</h1>
      <div className="max-w-sm">
        <SelectField
          label="المتجر"
          value={storeId}
          options={[{ value: '', label: 'اختر متجراً' }, ...(stores.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]}
          onChange={setStoreId}
        />
      </div>

      {!storeId ? null : products.isPending || products.isError ? (
        <LoadState error={products.isError ? errorMessage(products.error) : undefined} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState icon={Tag} title="لا توجد منتجات في هذا المتجر" />
      ) : (
        <Table headers={['المنتج', 'السعر', 'السعر قبل الخصم', 'يتحمل الخصم', '']}>
          {products.data.map((p) => (
            <tr key={p.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{p.name}</td>
              <td className="px-4 py-3">{formatMoney(p.price)}</td>
              <td className="px-4 py-3">{p.oldPrice === null ? '—' : formatMoney(p.oldPrice)}</td>
              <td className="px-4 py-3">{p.oldPrice === null ? '—' : PAID_BY_LABEL[p.discountPaidBy]}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button tone="soft" aria-label={`خصم ${p.name}`} onClick={() => setEditing(p)}>
                    خصم
                  </Button>
                  {p.oldPrice !== null ? (
                    <Button
                      tone="soft"
                      aria-label={`إنهاء خصم ${p.name}`}
                      disabled={discount.isPending}
                      onClick={() => discount.mutate({ productId: p.id, oldPrice: null, paidBy: p.discountPaidBy })}
                    >
                      إنهاء
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {editing ? <DiscountDialog product={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function DiscountDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const discount = useSetDiscount();
  const [oldPrice, setOldPrice] = useState(product.oldPrice === null ? '' : String(product.oldPrice));
  const [paidBy, setPaidBy] = useState<PaidBy>(product.discountPaidBy);
  const [tooLow, setTooLow] = useState(false);
  const value = Number(oldPrice);

  const submit = () => {
    if (!(value > product.price)) {
      setTooLow(true);
      return;
    }
    discount.mutate({ productId: product.id, oldPrice: value, paidBy }, { onSuccess: onClose });
  };

  return (
    <Dialog title={`خصم ${product.name}`} onClose={onClose}>
      <p className="text-sm text-tw-ink-2">السعر الآن {formatMoney(product.price)}</p>
      <TextField
        label="السعر قبل الخصم (ج.م)"
        inputMode="decimal"
        value={oldPrice}
        onChange={(e) => {
          setTooLow(false);
          setOldPrice(e.target.value);
        }}
      />
      <SelectField label="يتحمل الخصم" value={paidBy} options={(['store', 'app'] as const).map((p) => ({ value: p, label: PAID_BY_LABEL[p] }))} onChange={setPaidBy} />
      {tooLow ? <ErrorLine>السعر قبل الخصم يجب أن يكون أعلى من السعر</ErrorLine> : null}
      {discount.isError ? <ErrorLine>{errorMessage(discount.error)}</ErrorLine> : null}
      <DialogActions ready={oldPrice.trim() !== ''} busy={discount.isPending} onSave={submit} onClose={onClose} />
    </Dialog>
  );
}

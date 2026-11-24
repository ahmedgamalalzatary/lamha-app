'use client';

import { formatMoney } from '@tawsela/shared';
import { PackageX } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, EmptyState, ErrorLine, LoadState, Table } from '@/components/ui';
import { useInactiveProducts, useUpdateProduct } from '../catalog/api';

/** المنتجات والكتالوج › منتجات غير فعالة (contract §11, §1.1 A11): every store's switched-off products. */
export function InactiveProductsPage() {
  const products = useInactiveProducts();
  const update = useUpdateProduct();
  const [error, setError] = useState<string>();
  /** Rows being switched on. Each click has its own answer: a quick second click never hides the first one's error. */
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set());
  const switchOn = async (id: number) => {
    setError(undefined);
    setBusy((s) => new Set(s).add(id));
    try {
      await update.mutateAsync({ id, active: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">منتجات غير فعالة</h1>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {products.isPending || products.isError ? (
        <LoadState error={products.isError ? errorMessage(products.error) : undefined} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState icon={PackageX} title="لا توجد منتجات غير فعالة" message="كل المنتجات متاحة للعملاء" />
      ) : (
        <Table headers={['المنتج', 'المتجر', 'القسم', 'السعر', 'العمليات']}>
          {products.data.map((p) => (
            <tr key={p.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{p.name}</td>
              <td className="px-4 py-3">{p.storeName}</td>
              <td className="px-4 py-3">{p.categoryName}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatMoney(p.price)}</td>
              <td className="px-4 py-2">
                <Button
                  tone="soft"
                  className="h-9 px-4"
                  loading={busy.has(p.id)}
                  onClick={() => void switchOn(p.id)}
                >
                  تفعيل
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

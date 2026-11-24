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
                  loading={update.isPending && update.variables?.id === p.id}
                  onClick={() => {
                    setError(undefined);
                    update.mutate({ id: p.id, active: true }, { onError: (e) => setError(errorMessage(e)) });
                  }}
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

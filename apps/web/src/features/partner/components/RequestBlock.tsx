'use client';

import type { OrderRequest } from '@tawsela/shared';
import { mediaUrl } from '@/core/api/client';

const KIND = { prescription: 'روشتة طبية', product: 'صورة المنتج' } as const;

/**
 * A pharmacy request (contract §8.11): which card it came from, its photo (opens full size in a new
 * tab) and the customer's text. [Derived] Tawsilty's store side of a request is not captured.
 */
export function RequestBlock({ request }: { request: OrderRequest }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-tw">{KIND[request.kind]}</p>
      {request.image ? (
        <a href={mediaUrl(request.image)} target="_blank" rel="noreferrer" aria-label="فتح الصورة" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(request.image)} alt="صورة الطلب" className="max-h-80 w-full rounded-xl bg-tw-input object-contain" />
        </a>
      ) : null}
      {request.text ? (
        <div className="rounded-xl bg-tw-input p-3">
          <p className="font-semibold">اكتب طلبك</p>
          <p className="whitespace-pre-wrap">{request.text}</p>
        </div>
      ) : null}
      {request.priced ? null : <p className="text-sm text-tw-danger">سيتم إعلام العميل بالسعر عند القبول</p>}
    </div>
  );
}

/** "سعر الطلب": the medicine price, without the delivery, set before قبول. */
export function PriceInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-bold">سعر الطلب</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: 120"
        className="h-11 rounded-md border border-tw-line px-3"
      />
      <span className="text-xs text-tw-ink-2">سعر الأدوية بدون التوصيل، يصل للعميل مع القبول</span>
    </label>
  );
}

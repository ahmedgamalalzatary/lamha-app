'use client';

import type { UploadedImage } from '@tawsela/shared';
import { ImageUp, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { api, mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { ErrorLine } from './ui';

/**
 * An image for a catalog form: the preview, "رفع صورة" (uploaded to /v1/admin/uploads at once) and
 * "حذف الصورة". The form keeps the returned path ("/uploads/…").
 */
export function ImageField({ label, value, onChange }: { label: string; value: string | null; onChange: (path: string | null) => void }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const upload = async (file: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.append('image', file);
      onChange((await api.request<UploadedImage>('/admin/uploads', { method: 'POST', body: form })).url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-tw-ink">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-tw-input">
          {value ? (
            // Uploaded images are already resized by the API; a plain <img> is enough here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt={label} className="size-full object-cover" />
          ) : (
            <ImageUp className="size-6 text-tw-ink-2" aria-hidden />
          )}
        </div>
        <label
          htmlFor={inputId}
          className={`inline-flex h-10 cursor-pointer items-center rounded-full bg-tw-50 px-4 text-sm font-semibold text-tw-700 hover:bg-tw-100 ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          {busy ? 'جارٍ الرفع…' : 'رفع صورة'}
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          aria-label={`رفع صورة: ${label}`}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {value ? (
          <button type="button" onClick={() => onChange(null)} aria-label={`حذف الصورة: ${label}`} className="grid size-10 place-items-center rounded-full text-tw-danger hover:bg-tw-danger/10">
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
    </div>
  );
}

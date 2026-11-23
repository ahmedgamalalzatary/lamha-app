'use client';

import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@tawsela/shared';
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { api } from '@/core/api/client';

/** Shows whether the dashboard reaches the API (Phase 0's visible result). */
export function ApiStatus() {
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
  });

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-tw-ink-2">
        <LoaderCircle className="size-5 animate-spin text-tw" aria-hidden /> جارٍ الاتصال بالخادم…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-4">
        <p role="alert" className="flex items-center gap-2 font-medium text-tw-danger">
          <CircleX className="size-5" aria-hidden /> تعذر الاتصال بالخادم
        </p>
        <button
          type="button"
          disabled={isFetching}
          onClick={() => refetch()}
          className="rounded-full bg-tw px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <p className="flex items-center gap-2 font-medium text-tw-ok">
        <CircleCheck className="size-5" aria-hidden /> متصل بالخادم
      </p>
      <span className="text-sm text-tw-ink-2">الإصدار {data.version}</span>
    </div>
  );
}

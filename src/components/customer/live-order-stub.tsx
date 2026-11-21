"use client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useActiveOrder } from "@/lib/hooks";
import { storeById } from "@/lib/data/stores";
import { STATUS_TEXT } from "@/lib/order-sim";
import { Stamp } from "@/components/ui/stamp";
import { FlipNumber, StoreLogo } from "@/components/ui/bits";
import { mmss } from "@/lib/format";

/** The receipt stub of the live order, pinned on home. */
export function LiveOrderStub() {
  const { order, state } = useActiveOrder();
  if (!order || !state) return null;
  const store = storeById(order.storeId);
  const tone = state.status === "placed" ? "pen" : "stamp";
  return (
    <Link href={`/app/orders/${order.id}`} className="receipt-shadow tap mx-4 mt-4 block" aria-label={`تابع طلب ${order.number}`}>
      <div className="receipt px-4 pt-3.5">
        <div className="flex items-center gap-3">
          {store ? <StoreLogo store={store} size={40} /> : <span className="grid size-10 place-items-center rounded-xl bg-pen text-white">م</span>}
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-ink-3">طلب #{order.number} • {store?.name ?? "مشوار"}</p>
            <p className="truncate text-[15px] font-semibold">{STATUS_TEXT[state.status].title}</p>
          </div>
          <Stamp key={state.status} tone={tone} size="sm" animate>
            {STATUS_TEXT[state.status].stamp}
          </Stamp>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-1.5 text-pen">
            <FlipNumber value={state.remainingMinutes} className="text-[30px] font-bold leading-none" />
            <span className="text-[14px] font-medium">دقيقة</span>
          </div>
          {state.canCancel ? (
            <span className="text-[12.5px] text-ink-2">تقدر تلغي ببلاش خلال <b className="tabular-nums text-ink">{mmss(state.cancelSecondsLeft)}</b></span>
          ) : (
            <span className="inline-flex items-center text-[13px] font-medium text-pen">تابع على الخريطة <ChevronLeft className="size-4" /></span>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pen-50" role="progressbar" aria-valuenow={Math.round(state.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم الطلب">
          <div className="h-full rounded-full bg-pen transition-[width] duration-1000 ease-linear" style={{ width: `${Math.max(3, state.progress * 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}

"use client";
import { useMemo, useState } from "react";
import { ArrowDownUp, Bike, Star, Tag, Timer, X } from "lucide-react";
import type { Vertical } from "@/lib/types";
import { STORES } from "@/lib/data/stores";
import { StoreRow } from "./store-card";
import { Empty } from "@/components/ui/bits";
import { cx } from "@/lib/format";

type Sort = "near" | "rating" | "fast";
const SORTS: { id: Sort; label: string }[] = [
  { id: "near", label: "الأقرب" },
  { id: "rating", label: "الأعلى تقييماً" },
  { id: "fast", label: "الأسرع" },
];

export function StoresList({ cuisine, onClearCuisine, vertical = "food", noun = "مطعم" }: { cuisine?: string | null; onClearCuisine?: () => void; vertical?: Vertical; noun?: string }) {
  const [sort, setSort] = useState<Sort>("near");
  const [free, setFree] = useState(false);
  const [top, setTop] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [deals, setDeals] = useState(false);

  const list = useMemo(() => {
    let l = STORES.filter((s) => s.vertical === vertical);
    if (deals) l = l.filter((s) => !!s.promo);
    if (cuisine) l = l.filter((s) => s.tags.includes(cuisine));
    if (free) l = l.filter((s) => s.freeDeliveryOver !== undefined || s.deliveryFee === 0);
    if (top) l = l.filter((s) => s.rating >= 4.7);
    if (openNow) l = l.filter((s) => s.open);
    const by = { near: (a: typeof l[0], b: typeof l[0]) => a.distanceKm - b.distanceKm, rating: (a: typeof l[0], b: typeof l[0]) => b.rating - a.rating, fast: (a: typeof l[0], b: typeof l[0]) => a.etaMax - b.etaMax }[sort];
    return [...l].sort((a, b) => Number(b.open) - Number(a.open) || by(a, b));
  }, [cuisine, free, top, openNow, sort, vertical, deals]);

  const chip = (on: boolean) => cx("tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] ring-1 ring-inset", on ? "bg-ink text-white ring-ink" : "bg-sheet text-ink ring-rule");
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((s) => s.id === sort) + 1) % SORTS.length].id);

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(sort !== "near")} onClick={nextSort} aria-label={`الترتيب: ${SORTS.find((s) => s.id === sort)!.label}`}>
          <ArrowDownUp className="size-4" /> {SORTS.find((s) => s.id === sort)!.label}
        </button>
        <button className={chip(free)} aria-pressed={free} onClick={() => setFree(!free)}><Bike className="size-4" /> عروض التوصيل</button>
        <button className={chip(deals)} aria-pressed={deals} onClick={() => setDeals(!deals)}><Tag className="size-4" /> خصومات</button>
        <button className={chip(top)} aria-pressed={top} onClick={() => setTop(!top)}><Star className="size-4" /> 4.7 وأعلى</button>
        <button className={chip(openNow)} aria-pressed={openNow} onClick={() => setOpenNow(!openNow)}><Timer className="size-4" /> مفتوح دلوقتي</button>
        {cuisine && (
          <button className={chip(true)} onClick={onClearCuisine}>
            {cuisine} <X className="size-4" />
          </button>
        )}
      </div>
      <p className="px-4 pt-3 text-[13px] text-ink-3" aria-live="polite">{list.length} {noun}</p>
      {list.length === 0 ? (
        <Empty icon={<Star className="size-7" />} title="مفيش نتايج بالفلاتر دي" body="شيل فلتر أو اتنين وهتلاقي اختيارات أكتر." action={<button className="tap rounded-xl bg-pen-50 px-4 py-2 text-[14px] text-pen" onClick={() => { setFree(false); setTop(false); setOpenNow(false); setDeals(false); onClearCuisine?.(); }}>امسح الفلاتر</button>} />
      ) : (
        <div className="mt-2 space-y-3 px-4">
          {list.map((s) => <StoreRow key={s.id} store={s} />)}
        </div>
      )}
    </div>
  );
}

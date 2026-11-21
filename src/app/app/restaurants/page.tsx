"use client";
import { useState } from "react";
import { TopBar, Photo } from "@/components/ui/bits";
import { StoresList } from "@/components/customer/stores-list";
import { CUISINES } from "@/lib/data/stores";
import { cx } from "@/lib/format";

export default function Restaurants() {
  const [cuisine, setCuisine] = useState<string | null>(null);
  return (
    <main>
      <TopBar title="مطاعم وكافيهات" subtitle="الفيوم" />
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4 pt-1.5">
        {CUISINES.map((c) => (
          <button key={c.id} aria-pressed={cuisine === c.id} onClick={() => setCuisine(cuisine === c.id ? null : c.id)} className="tap flex w-[66px] shrink-0 flex-col items-center gap-1.5">
            <Photo src={c.img} alt="" className={cx("size-[60px] rounded-full ring-[3px] ring-offset-2 ring-offset-paper", cuisine === c.id ? "ring-pen" : "ring-transparent")} sizes="60px" />
            <span className={cx("text-center text-[12px] leading-tight", cuisine === c.id ? "font-semibold text-pen" : "text-ink-2")}>{c.label}</span>
          </button>
        ))}
      </div>
      <StoresList cuisine={cuisine} onClearCuisine={() => setCuisine(null)} />
    </main>
  );
}

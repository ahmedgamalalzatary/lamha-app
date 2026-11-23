"use client";
import { useState } from "react";
import { TopBar, Photo } from "@/components/ui/bits";
import { StoresList } from "@/components/customer/stores-list";
import { MiniStoreCard } from "@/components/customer/store-card";
import { CUISINES, storeById } from "@/lib/data/stores";
import { useCustomer } from "@/lib/store/customer";
import { cx } from "@/lib/format";

export default function Restaurants() {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const orders = useCustomer((s) => s.orders);
  // Stores this customer already ordered from (newest first, no repeats)
  const again = [...new Set(orders.filter((o) => o.kind !== "courier").map((o) => o.storeId))]
    .map((id) => storeById(id))
    .filter((s) => s && s.vertical === "food");

  return (
    <main>
      <TopBar title="مطاعم وكافيهات" subtitle="الفيوم" />
      {again.length > 0 && (
        <section className="bg-cream py-4">
          <h2 className="px-4 text-[19px] font-bold">اطلب من جديد</h2>
          <div className="no-scrollbar mt-3 grid auto-cols-[84%] grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-4 pb-1">
            {again.map((s) => <MiniStoreCard key={s!.id} store={s!} />)}
          </div>
        </section>
      )}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4 pt-4">
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

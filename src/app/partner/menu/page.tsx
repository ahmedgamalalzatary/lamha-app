"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Search } from "lucide-react";
import { usePartner, PARTNER_STORE_ID } from "@/lib/store/partner";
import { storeById } from "@/lib/data/stores";
import type { MenuItem } from "@/lib/types";
import { Photo, Switch, TopBar } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { egp, cx } from "@/lib/format";

export default function PartnerMenu() {
  const store = storeById(PARTNER_STORE_ID)!;
  const { soldOut, priceOverride, toggleSoldOut, setPrice } = usePartner();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [price, setPriceInput] = useState("");

  const cats = store.menu.filter((c) => cat === "all" || c.id === cat);
  const total = store.menu.flatMap((c) => c.items).length;
  const off = store.menu.flatMap((c) => c.items).filter((i) => soldOut[i.id]).length;

  return (
    <main className="min-h-dvh">
      <TopBar title="المنيو" subtitle={`${total} صنف • ${off ? `${off} خلصان` : "كله متاح"}`} back={false} />
      <div className="px-4">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-sheet px-3 ring-1 ring-rule focus-within:ring-2 focus-within:ring-pen">
          <Search className="size-4.5 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على صنف" className="h-full flex-1 bg-transparent text-[15px] outline-none" />
        </div>
        <p className="mt-3 rounded-xl bg-pen-50 p-3 text-[13px] leading-relaxed text-ink-2">أي صنف تقفله بيختفي من عند العملاء في نفس اللحظة. جرّب تقفل صنف وافتح تطبيق العميل.</p>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", name: "الكل" }, ...store.menu].map((c) => (
          <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={cx("tap h-9 shrink-0 rounded-full px-4 text-[14px] ring-1 ring-inset", cat === c.id ? "bg-ink text-white ring-ink" : "bg-sheet ring-rule")}>{c.name}</button>
        ))}
      </div>
      {cats.map((c) => {
        const items = c.items.filter((i) => !q || i.name.includes(q));
        if (!items.length) return null;
        return (
          <section key={c.id} className="mt-5 px-4">
            <h2 className="mb-2 text-[15px] font-semibold text-ink-2">{c.name}</h2>
            <ul className="divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
              {items.map((it) => {
                const out = !!soldOut[it.id];
                const p = priceOverride[it.id] ?? it.price;
                return (
                  <li key={it.id} className="flex items-center gap-3 p-3">
                    <Photo src={it.img} alt="" className={cx("size-14 shrink-0 rounded-xl", out && "grayscale opacity-60")} sizes="56px" />
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate text-[15px] font-medium", out && "text-ink-3")}>{it.name}</p>
                      <button onClick={() => { setEditing(it); setPriceInput(String(p)); }} className="tap mt-0.5 inline-flex items-center gap-1 rounded-md text-[14px] font-semibold tabular-nums text-pen">
                        {egp(p)} <Pencil className="size-3.5" />
                      </button>
                      <p className={cx("text-[12px]", out ? "font-medium text-void" : "text-stamp")}>{out ? "خلصان النهارده" : "متاح"}</p>
                    </div>
                    <Switch checked={!out} onChange={() => { toggleSoldOut(it.id); toast(out ? `${it.name} رجع متاح` : `${it.name} اتقفل عند العملاء`); }} label={`${it.name} متاح`} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <Sheet open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title={editing ? `سعر ${editing.name}` : ""} description="السعر الجديد بيظهر للعملاء على طول."
        footer={<Button block size="lg" disabled={!Number(price)} onClick={() => { setPrice(editing!.id, Number(price)); toast.success("السعر اتحدث"); setEditing(null); }}>احفظ السعر</Button>}>
        <div className="px-5 pb-4">
          <label className="flex h-16 items-center gap-2 rounded-2xl bg-paper px-4 ring-1 ring-rule focus-within:ring-2 focus-within:ring-pen">
            <input autoFocus inputMode="decimal" value={price} onChange={(e) => setPriceInput(e.target.value.replace(/[^\d.]/g, ""))} className="h-full flex-1 bg-transparent text-[26px] font-bold tabular-nums outline-none" aria-label="السعر" />
            <span className="text-[16px] text-ink-2">ج.م</span>
          </label>
        </div>
      </Sheet>
    </main>
  );
}

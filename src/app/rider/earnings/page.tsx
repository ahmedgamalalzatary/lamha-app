"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Banknote, LayoutGrid, Star } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { TopBar } from "@/components/ui/bits";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { egp, clock, cx } from "@/lib/format";

/* Synthetic week figures */
const WEEK: [string, number][] = [["سبت", 410], ["حد", 365], ["اتنين", 290], ["تلات", 455], ["أربع", 380], ["خميس", 520]];

export default function Earnings() {
  const { trips, cashInHand } = useRider();
  const [settle, setSettle] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const today = trips.filter((t) => Date.now() - t.at < 24 * 3600_000);
  const fees = today.reduce((s, t) => s + t.fee, 0);
  const tips = today.reduce((s, t) => s + t.tip, 0);
  const bonus = today.length >= 5 ? 50 : 0;
  const bars = [...WEEK, ["النهارده", fees + tips + bonus] as [string, number]];
  const max = Math.max(...bars.map(([, v]) => v));
  const shown = sel ?? bars.length - 1;

  return (
    <main className="min-h-dvh pb-6">
      <TopBar title="أرباحي" subtitle="محمود جمال • 4.9" back={false} actions={<Link href="/" aria-label="بدّل التطبيق" className="tap grid size-10 place-items-center rounded-full"><LayoutGrid className="size-5" /></Link>} />
      <div className="px-4">
        <Receipt>
          <p className="text-[15px] font-semibold">كشف النهارده</p>
          <div className="mt-1 text-[14.5px]">
            <Row label={`${today.length} مشوار`} amount={fees} />
            <Row label="إكراميات" amount={tips} tone="stamp" note="بتوصلك كاملة من غير خصم" />
            <Row label="بونص 5 مشاوير" amount={bonus} note={bonus ? undefined : `فاضل ${Math.max(0, 5 - today.length)} مشوار وتاخد 50 ج.م`} />
          </div>
          <Perf />
          <Row label={<span className="marked font-bold">ليك النهارده</span>} amount={fees + tips + bonus} bold />
        </Receipt>
      </div>

      <section className="mx-4 mt-4 flex items-center gap-3 rounded-[18px] bg-marker-soft p-4">
        <Banknote className="size-7 shrink-0" />
        <div className="flex-1"><p className="text-[15px] font-semibold">معاك كاش {egp(cashInHand)}</p><p className="text-[12.5px] text-ink-2">ورّده من أي فرع فوري أو مكتب لمحة</p></div>
        <Button size="sm" variant="ink" onClick={() => setSettle(true)}>ورّد</Button>
      </section>

      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="text-[15px] font-semibold">الأسبوع ده</h2>
        <p className="mt-2 text-[24px] font-bold tabular-nums">{egp(bars[shown][1])} <span className="text-[13px] font-normal text-ink-3">{bars[shown][0]}</span></p>
        <div className="mt-3 flex h-28 items-end gap-2 border-b border-rule">
          {bars.map(([k, v], i) => <button key={k} aria-label={`${k}: ${egp(v)}`} aria-pressed={shown === i} onClick={() => setSel(i)} className="flex h-full flex-1 flex-col justify-end"><span className={cx("block rounded-t-[4px]", shown === i ? "bg-stamp" : "bg-stamp/30")} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} /></button>)}
        </div>
        <div className="mt-1.5 flex gap-2">{bars.map(([k], i) => <span key={k} className={cx("flex-1 truncate text-center text-[10.5px]", shown === i ? "font-semibold text-ink" : "text-ink-3")}>{k}</span>)}</div>
      </section>

      <h2 className="mt-6 px-4 text-[15px] font-semibold">مشاوير النهارده</h2>
      <ul className="mx-4 mt-2 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
        {today.map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3.5">
            <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-medium">{t.storeName} ← {t.area}</span><span className="text-[12.5px] text-ink-3">#{t.number} • {clock(t.at)} • {t.km} كم</span></span>
            <span className="text-end"><span className="block text-[15px] font-semibold tabular-nums">{egp(t.fee)}</span>{t.tip > 0 && <span className="text-[12px] text-stamp">+{t.tip} إكرامية</span>}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center justify-center gap-1 text-[13px] text-ink-3"><Star className="size-4 fill-marker text-[#e0b400]" /> تقييمك 4.9 من 1,240 مشوار</p>

      <Sheet open={settle} onOpenChange={setSettle} title="ورّد الكاش" description="ادفع المبلغ ده في أي فرع فوري بالكود.">
        <div className="flex flex-col items-center px-5 pb-8">
          <p className="text-[34px] font-bold tabular-nums">{egp(cashInHand)}</p>
          <p className="mt-3 rounded-2xl border-2 border-dashed border-rule px-6 py-3 text-[26px] font-bold tracking-[0.2em]" dir="ltr">LM 4471 902</p>
          <Button className="mt-5" variant="secondary" onClick={() => { navigator.clipboard?.writeText("LM4471902").catch(() => {}); toast.success("الكود اتنسخ"); }}>انسخ الكود</Button>
        </div>
      </Sheet>
    </main>
  );
}

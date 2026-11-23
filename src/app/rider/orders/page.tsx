"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Search } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { TopBar } from "@/components/ui/bits";
import { egp, cx } from "@/lib/format";

const iso = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const longDay = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Rider order history: date range, status, complaint per order, totals at the bottom. */
export default function RiderOrders() {
  const trips = useRider((s) => s.trips);
  const [from, setFrom] = useState(() => iso(Date.now() - 30 * 86_400_000));
  const [to, setTo] = useState(() => iso(Date.now()));
  const [range, setRange] = useState({ from, to });

  const list = useMemo(() => trips.filter((t) => iso(t.at) >= range.from && iso(t.at) <= range.to).sort((a, b) => b.at - a.at), [trips, range]);
  const done = list.filter((t) => t.status !== "cancelled");
  const profit = done.reduce((a, t) => a + t.fee + t.tip, 0);

  return (
    <main className="min-h-dvh pb-40">
      <TopBar title="سجل الطلبات" back="/rider/account" />
      <div className="grid grid-cols-2 gap-3 px-4">
        {([["من", from, setFrom], ["إلى", to, setTo]] as const).map(([l, v, set]) => (
          <label key={l} className="flex h-12 items-center gap-2 rounded-full px-4 ring-1 ring-leader">
            <CalendarDays className="size-5 text-ink-3" />
            <span className="sr-only">{l}</span>
            <input type="date" value={v} onChange={(e) => set(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] text-ink-2 outline-none" />
          </label>
        ))}
      </div>
      <button onClick={() => setRange({ from, to })} className="tap mx-auto mt-3 flex h-11 w-[70%] items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-pen ring-1 ring-pen">
        <Search className="size-5" /> بحث
      </button>

      <ul className="mt-5 space-y-3 px-4">
        {list.map((t) => {
          const cancelled = t.status === "cancelled";
          return (
            <li key={t.id} className="overflow-hidden rounded-[18px] bg-sheet ring-1 ring-rule">
              <div className={cx("flex items-center justify-between px-4 py-3", cancelled ? "bg-pen-50" : "")}>
                <p className="text-[17px] font-bold tabular-nums">الطلب #{t.number}</p>
                <span className={cx("rounded-xl px-3 py-1 text-[13.5px] font-semibold ring-1", cancelled ? "text-void ring-void" : "text-stamp ring-stamp")}>{cancelled ? "ملغي" : "تم التوصيل"}</span>
              </div>
              <div className="flex items-end justify-between px-4 pb-3">
                <div className="text-[15px]">
                  <p>{t.storeName} ← {t.area}</p>
                  <p className="mt-1 text-ink-2">الإجمالي <span className="tabular-nums">{t.items ?? 1}</span> منتج</p>
                </div>
                <button onClick={() => toast.success(`الشكوى عن طلب #${t.number} اتسجلت`)} className="tap rounded-xl bg-sheet px-3 py-2 text-[14px] font-bold text-void shadow-sheet">تقديم شكوى</button>
              </div>
              <div className="flex items-center justify-between border-t border-rule px-4 py-2.5 text-[13.5px]">
                <span className="text-ink-2">{longDay(t.at)}</span>
                {!cancelled && <span className="font-bold tabular-nums text-stamp">+ {egp(t.fee + t.tip)}</span>}
              </div>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-12 text-center text-[14px] text-ink-3">مفيش طلبات في الفترة دي</li>}
      </ul>

      <div className="fixed inset-x-0 bottom-[64px] z-30 mx-auto max-w-[440px] rounded-t-[24px] bg-paper px-6 py-4 shadow-lift">
        <p className="flex justify-center gap-2 text-[16px] font-bold"><span className="text-pen">اجمالي الأرباح :</span><span className="tabular-nums">{egp(profit)}</span></p>
        <p className="mt-1 flex justify-center gap-2 text-[16px] font-bold"><span className="text-pen">عدد الطلبات المكتملة :</span><span className="tabular-nums">{done.length}</span></p>
      </div>
    </main>
  );
}

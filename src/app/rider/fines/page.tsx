"use client";
import { TriangleAlert } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { TopBar } from "@/components/ui/bits";
import { egp } from "@/lib/format";

const when = (ts: number) => new Date(ts).toLocaleString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

/** Every deduction with its reason, so the rider always knows why money was taken. */
export default function RiderFines() {
  const { fines, notices } = useRider();
  const total = fines.reduce((a, f) => a + f.amount, 0);
  return (
    <main className="min-h-dvh pb-8">
      <TopBar title="الخصومات والغرامات" back="/rider/account" />
      <div className="mx-4 rounded-[20px] bg-void-50 p-4">
        <p className="text-[14px] text-ink-2">إجمالي الخصومات</p>
        <p className="text-[28px] font-bold tabular-nums text-void">{egp(total)}</p>
        <p className="text-[12.5px] text-ink-3">بتتخصم من فاتورتك الأسبوعية</p>
      </div>
      <ul className="mx-4 mt-4 space-y-3">
        {fines.map((f) => (
          <li key={f.id} className="flex gap-3 rounded-[18px] bg-sheet p-4 shadow-sheet">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-void-50 text-void"><TriangleAlert className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{f.reason}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{when(f.at)}{f.order ? ` • طلب #${f.order}` : ""}</p>
            </div>
            <span className="text-[16px] font-bold tabular-nums text-void">−{egp(f.amount)}</span>
          </li>
        ))}
        {fines.length === 0 && <li className="py-10 text-center text-[14px] text-ink-3">مفيش خصومات. استمر كده</li>}
      </ul>
      {notices.length > 0 && (
        <>
          <h2 className="mt-6 px-4 text-[15px] font-semibold">التنبيهات</h2>
          <ul className="mx-4 mt-2 divide-y divide-rule rounded-[18px] bg-sheet shadow-sheet">
            {notices.map((n) => <li key={n.id} className="p-3.5 text-[14px]"><span className={n.tone === "bad" ? "text-void" : n.tone === "warn" ? "text-pen-700" : ""}>{n.text}</span></li>)}
          </ul>
        </>
      )}
    </main>
  );
}

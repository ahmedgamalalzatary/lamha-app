"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { usePartner } from "@/lib/store/partner";
import { TopBar, Segmented } from "@/components/ui/bits";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { egp, ago, cx } from "@/lib/format";

/* Synthetic demo figures */
const DATA = {
  week: { label: "آخر 7 أيام", bars: [["سبت", 4120], ["حد", 3380], ["اتنين", 3610], ["تلات", 3950], ["أربع", 4480], ["خميس", 6240], ["جمعة", 7310]] as [string, number][], orders: 248, cancel: 1.6 },
  month: { label: "آخر 4 أسابيع", bars: [["أسبوع 1", 26100], ["أسبوع 2", 28750], ["أسبوع 3", 27400], ["أسبوع 4", 33090]] as [string, number][], orders: 1012, cancel: 1.9 },
};
const TOP = [["شاورما فراخ", 412], ["وجبة شاورما فراخ عربي", 268], ["شاورما لحمة", 199], ["بطاطس", 176], ["فتة شاورما", 98]] as const;
const HOURS = [2, 1, 1, 3, 6, 9, 7, 5, 6, 10, 14, 12];
const HOUR_LABEL = ["12ظ", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11م"];

export default function Reports() {
  const [range, setRange] = useState<"week" | "month">("week");
  const [sel, setSel] = useState<number | null>(null);
  const { reviews, reply } = usePartner();
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const d = DATA[range];
  const gross = d.bars.reduce((s, [, v]) => s + v, 0);
  const commission = Math.round(gross * 0.12);
  const max = Math.max(...d.bars.map(([, v]) => v));
  const shown = sel ?? d.bars.length - 1;

  return (
    <main className="min-h-dvh pb-6">
      <TopBar title="التقارير والتقييمات" subtitle="شاورما الساقية" back="/partner/account" />
      <div className="px-4">
        <Segmented value={range} onChange={(v) => { setRange(v); setSel(null); }} options={[{ value: "week", label: "الأسبوع" }, { value: "month", label: "الشهر" }]} />
      </div>

      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet" aria-labelledby="sales-h">
        <h2 id="sales-h" className="text-[15px] font-semibold">المبيعات اليومية</h2>
        <p className="text-[12.5px] text-ink-3">{d.label} • دوس على أي عمود</p>
        <p className="mt-3 text-[26px] font-bold tabular-nums">{egp(d.bars[shown][1])}</p>
        <p className="text-[13px] text-ink-2">{d.bars[shown][0]}</p>
        <div className="mt-4 flex h-40 items-end gap-2 border-b border-rule" role="list">
          {d.bars.map(([k, v], i) => (
            <button key={k} role="listitem" aria-label={`${k}: ${egp(v)}`} aria-pressed={shown === i} onClick={() => setSel(i)} className="group flex h-full flex-1 flex-col justify-end">
              <span className={cx("block w-full rounded-t-[4px] transition-colors", shown === i ? "bg-pen" : "bg-pen/30 group-hover:bg-pen/50")} style={{ height: `${(v / max) * 100}%` }} />
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-2">
          {d.bars.map(([k], i) => <span key={k} className={cx("flex-1 truncate text-center text-[11px]", shown === i ? "font-semibold text-ink" : "text-ink-3")}>{k}</span>)}
        </div>
      </section>

      <div className="mt-4 px-4">
        <Receipt>
          <p className="text-[15px] font-semibold">كشف حساب {d.label}</p>
          <div className="mt-1 text-[14.5px]">
            <Row label={`المبيعات (${d.orders} طلب)`} amount={gross} />
            <Row label="عمولة لمحة 12%" amount={-commission} />
            <Row label="رسوم توصيل" amount={0} note="التوصيل على العميل ولمحة، مش عليك" />
          </div>
          <Perf />
          <Row label={<span className="marked font-bold">صافي ليك</span>} amount={gross - commission} bold />
          <p className="mt-1 text-[12.5px] text-ink-3">بيتحول على حسابك في بنك مصر كل يوم أحد • نسبة الإلغاء {d.cancel}%</p>
        </Receipt>
      </div>

      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="text-[15px] font-semibold">الأكثر مبيعاً</h2>
        <ul className="mt-3 space-y-2.5">
          {TOP.map(([n, v]) => (
            <li key={n}>
              <div className="flex justify-between text-[14px]"><span>{n}</span><span className="tabular-nums text-ink-2">{v} مرة</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-paper"><div className="h-full rounded-full bg-pen" style={{ width: `${(v / TOP[0][1]) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="text-[15px] font-semibold">ساعات الذروة</h2>
        <p className="text-[12.5px] text-ink-3">كل ما المربع أغمق، الطلبات أكتر. جهّز عمالة زيادة بعد 9 بالليل.</p>
        <div className="mt-3 grid grid-cols-12 gap-1" role="list">
          {HOURS.map((h, i) => (
            <div key={i} role="listitem" aria-label={`الساعة ${HOUR_LABEL[i]}: ${h * 4} طلب`} className="flex flex-col items-center gap-1">
              <span className="block aspect-square w-full rounded-[4px]" style={{ background: `color-mix(in oklab, var(--color-pen) ${Math.round((h / 14) * 92) + 8}%, var(--color-pen-50))` }} />
              <span className="text-[9.5px] text-ink-3">{HOUR_LABEL[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">آراء العملاء</h2>
          <span className="flex items-center gap-1 text-[14px] font-semibold"><Star className="size-4 fill-marker text-[#eaa407]" /> 4.8</span>
        </div>
        <ul className="mt-2 divide-y divide-rule">
          {reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] font-medium">{r.name}</span>
                <span className="flex">{Array.from({ length: 5 }, (_, k) => <Star key={k} className={cx("size-3.5", k < r.stars ? "fill-marker text-[#eaa407]" : "text-rule")} />)}</span>
              </div>
              <p className="mt-1 text-[14px] text-ink-2">{r.text}</p>
              <p className="text-[12px] text-ink-3">{ago(r.at)}</p>
              {r.reply ? (
                <p className="mt-2 rounded-xl bg-paper p-2.5 text-[13.5px]"><b>ردك:</b> {r.reply}</p>
              ) : (
                <button onClick={() => { setReplying(r.id); setText(""); }} className="mt-1.5 text-[13.5px] font-medium text-pen">رد على التقييم</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Sheet open={!!replying} onOpenChange={(v) => !v && setReplying(null)} title="ردك على العميل" description="الرد بيظهر للكل تحت التقييم."
        footer={<Button block size="lg" disabled={text.trim().length < 3} onClick={() => { reply(replying!, text.trim()); toast.success("ردك اتنشر"); setReplying(null); }}>انشر الرد</Button>}>
        <div className="px-5 pb-4"><textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="شكراً لتقييمك..." className="w-full resize-none rounded-2xl bg-paper p-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" /></div>
      </Sheet>
    </main>
  );
}

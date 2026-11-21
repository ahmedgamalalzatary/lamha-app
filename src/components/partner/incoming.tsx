"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, MapPin, MessageSquareText } from "lucide-react";
import { usePartner } from "@/lib/store/partner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { egp, cx } from "@/lib/format";

const PREP = [10, 15, 20, 30];
const REASONS = ["صنف خلص", "زحمة جداً", "المحل هيقفل", "سبب تاني"];
const WINDOW = 90;

export function IncomingSheet({ id, onDone }: { id: string | null; onDone: () => void; sound: boolean }) {
  const { orders, accept, reject } = usePartner();
  const o = orders.find((x) => x.id === id && x.status === "new");
  const [prep, setPrep] = useState(15);
  const [left, setLeft] = useState(WINDOW);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!o) return;
    setLeft(Math.max(0, WINDOW - Math.floor((Date.now() - o.placedAt) / 1000)));
    setRejecting(false);
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [o]);

  if (!o) return null;

  return (
    <Sheet open={!!o} onOpenChange={(v) => !v && onDone()} title={undefined}>
      <div className="px-5 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-pen text-white" style={{ animation: "pulse-ring 1.2s infinite" }}><BellRing className="size-6" /></span>
          <div className="flex-1">
            <p className="text-[20px] font-bold">طلب جديد #{o.number}</p>
            <p className="text-[13.5px] text-ink-2">{o.customer} • <MapPin className="inline size-3.5" /> {o.area}</p>
          </div>
          <div className="text-center">
            <p className={cx("text-[22px] font-bold tabular-nums", left < 20 ? "text-void" : "text-ink")}>{left}</p>
            <p className="text-[11px] text-ink-3">ثانية</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule"><div className={cx("h-full transition-[width] duration-1000 ease-linear", left < 20 ? "bg-void" : "bg-pen")} style={{ width: `${(left / WINDOW) * 100}%` }} /></div>

        <div className="mt-4">
          <Receipt>
            <ul className="space-y-1 text-[15px]">
              {o.lines.map((l, i) => (
                <li key={i}>
                  <Row label={<span><b className="tabular-nums">{l.qty}×</b> {l.name}</span>} amount={l.price} className="!py-0.5" />
                  {l.opts && <p className="-mt-0.5 text-[12.5px] text-ink-3">{l.opts}</p>}
                </li>
              ))}
            </ul>
            {o.note && <p className="mt-2 flex gap-1.5 rounded-xl bg-marker-soft p-2 text-[13.5px]"><MessageSquareText className="mt-0.5 size-4 shrink-0" /> {o.note}</p>}
            <Perf className="my-3" />
            <Row label={<span className="marked font-bold">الإجمالي</span>} amount={o.total} bold />
            <p className="text-[12.5px] text-ink-3">{{ cash: "كاش مع الطيار", card: "مدفوع كارت", wallet: "مدفوع من المحفظة" }[o.payment]}</p>
          </Receipt>
        </div>

        {!rejecting ? (
          <>
            <p className="mt-4 text-[14.5px] font-medium">هيجهز في قد إيه؟</p>
            <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="وقت التحضير">
              {PREP.map((p) => <button key={p} role="radio" aria-checked={prep === p} onClick={() => setPrep(p)} className={cx("tap h-12 rounded-xl text-[15px] font-semibold tabular-nums ring-1 ring-inset", prep === p ? "bg-pen text-white ring-pen" : "ring-rule")}>{p} د</button>)}
            </div>
            <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="danger" size="lg" onClick={() => setRejecting(true)}>ارفض</Button>
              <Button size="lg" onClick={() => { accept(o.id, prep); toast.success(`قبلت طلب #${o.number} • العميل اتبلغ إنه هيجهز في ${prep} دقيقة`); onDone(); }}>اقبل الطلب</Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-[14.5px] font-medium">ليه هترفض؟ العميل هيعرف السبب وفلوسه ترجعله.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {REASONS.map((r) => <Button key={r} variant="outline" onClick={() => { reject(o.id, r); toast(`رفضت طلب #${o.number}`); onDone(); }}>{r}</Button>)}
            </div>
            <button onClick={() => setRejecting(false)} className="mt-3 w-full text-center text-[14px] text-pen">رجوع</button>
          </>
        )}
        <p className="mt-3 text-center text-[12px] text-ink-3">بيتحسب {egp(Math.round(o.total * 0.12))} عمولة • صافي ليك {egp(o.total - Math.round(o.total * 0.12))}</p>
      </div>
    </Sheet>
  );
}

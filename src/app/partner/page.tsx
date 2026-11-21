"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Bike, Clock, MessageSquareText, Printer, Plus, Timer } from "lucide-react";
import { usePartner, PARTNER_STORE_ID, type POStatus } from "@/lib/store/partner";
import { storeById } from "@/lib/data/stores";
import { StoreLogo, Empty } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { useNow } from "@/lib/hooks";
import { egp, clock, cx } from "@/lib/format";
import { ring } from "@/lib/sound";

const COLS: { id: POStatus; label: string }[] = [
  { id: "preparing", label: "بيتجهز" },
  { id: "ready", label: "جاهز" },
  { id: "out", label: "مع الطيار" },
  { id: "done", label: "اتسلم" },
];
const NEXT_LABEL: Partial<Record<POStatus, string>> = { preparing: "خلص، جاهز للاستلام", ready: "سلّمته للطيار", out: "العميل استلم" };

export default function PartnerOrders() {
  const now = useNow(1000);
  const { orders, status, setStatus, advance, incoming, sound } = usePartner();
  const store = storeById(PARTNER_STORE_ID)!;
  const [tab, setTab] = useState<POStatus>("preparing");
  const today = useMemo(() => orders.filter((o) => o.status !== "rejected" && now - o.placedAt < 24 * 3600_000), [orders, now]);
  const sales = today.reduce((s, o) => s + o.total, 0);
  const list = orders.filter((o) => o.status === tab);

  return (
    <main className="min-h-dvh">
      <header className="bg-ink px-4 pb-4 pt-4 text-white">
        <div className="flex items-center gap-3">
          <StoreLogo store={store} size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-semibold">{store.name}</h1>
            <p className="text-[12.5px] text-white/70">لوحة المحل • {clock(now)}</p>
          </div>
          <button onClick={() => { const o = incoming(); if (sound) ring(); toast(`طلب جديد #${o.number}`); }} className="tap inline-flex h-9 items-center gap-1 rounded-xl bg-white/12 px-3 text-[12.5px]"><Plus className="size-4" /> طلب تجريبي</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-1" role="radiogroup" aria-label="حالة المحل">
          {([["open", "مفتوح", "bg-stamp"], ["busy", "زحمة +15 د", "bg-[#e0a100]"], ["closed", "مقفول", "bg-void"]] as const).map(([k, l, c]) => (
            <button key={k} role="radio" aria-checked={status === k} onClick={() => { setStatus(k); toast(k === "open" ? "المحل مفتوح ويستقبل طلبات" : k === "busy" ? "العملاء هيشوفوا وقت توصيل أطول بـ 15 دقيقة" : "المحل مقفول ومش هيظهر في الطلبات"); }} className={cx("tap flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-medium", status === k ? "bg-sheet text-ink" : "text-white/80")}>
              <span className={cx("size-2 rounded-full", c)} /> {l}
            </button>
          ))}
        </div>
        <dl className="mt-4 flex items-baseline justify-between text-[13px] text-white/70">
          <div><dt>مبيعات النهارده</dt><dd className="text-[20px] font-bold text-white tabular-nums">{egp(sales)}</dd></div>
          <div><dt>طلبات</dt><dd className="text-[20px] font-bold text-white tabular-nums">{today.length}</dd></div>
          <div><dt>متوسط التحضير</dt><dd className="text-[20px] font-bold text-white tabular-nums">14 د</dd></div>
        </dl>
      </header>

      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-rule px-3" role="tablist">
          {COLS.map((c) => {
            const n = orders.filter((o) => o.status === c.id).length;
            return (
              <button key={c.id} role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)} className={cx("relative flex h-12 shrink-0 items-center gap-1.5 px-3 text-[14.5px]", tab === c.id ? "font-semibold text-pen" : "text-ink-2")}>
                {c.label}
                <span className={cx("grid min-w-5 place-items-center rounded-full px-1 text-[11.5px] font-bold tabular-nums", tab === c.id ? "bg-pen text-white" : "bg-rule text-ink-2")}>{n}</span>
                {tab === c.id && <motion.span layoutId="ptab-ink" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-pen" />}
              </button>
            );
          })}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon={<Timer className="size-8" />} title={status === "closed" ? "المحل مقفول" : "مفيش طلبات هنا دلوقتي"} body={status === "closed" ? "افتح المحل من فوق عشان تبدأ تستقبل طلبات." : "أول ما طلب يوصل هتسمع جرس ويظهرلك على طول."} />
      ) : (
        <ul className="space-y-3 px-4 pt-4">
          <AnimatePresence initial={false}>
            {list.map((o) => {
              const mins = o.acceptedAt ? Math.floor((now - o.acceptedAt) / 60_000) : 0;
              const late = o.status === "preparing" && o.prepMin !== undefined && mins > o.prepMin;
              return (
                <motion.li key={o.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="receipt-shadow">
                  <div className="receipt px-4 pt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[17px] font-bold">#{o.number} <span className="text-[14px] font-medium text-ink-2">• {o.customer}</span></p>
                        <p className="flex items-center gap-1 text-[12.5px] text-ink-3"><Clock className="size-3.5" /> {clock(o.placedAt)} • {o.area}</p>
                      </div>
                      {o.status === "preparing" ? (
                        <span className={cx("rounded-lg px-2 py-1 text-[13px] font-semibold tabular-nums", late ? "bg-void-50 text-void" : "bg-pen-50 text-pen")}>{mins} من {o.prepMin} د</span>
                      ) : o.status === "done" ? (
                        <Stamp tone="stamp" size="sm">اتسلم</Stamp>
                      ) : o.status === "out" ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-stamp-50 px-2 py-1 text-[12.5px] font-medium text-stamp"><Bike className="size-4" /> {o.rider}</span>
                      ) : (
                        <span className="rounded-lg bg-marker-soft px-2 py-1 text-[12.5px] font-medium">الطيار جاي في 4 د</span>
                      )}
                    </div>
                    <ul className="mt-2 border-t-2 border-dotted border-leader pt-2 text-[14.5px]">
                      {o.lines.map((l, i) => <li key={i} className="py-0.5"><b className="tabular-nums">{l.qty}×</b> {l.name}{l.opts && <span className="text-ink-3"> • {l.opts}</span>}</li>)}
                    </ul>
                    {o.note && <p className="mt-2 flex gap-1.5 rounded-xl bg-marker-soft p-2 text-[13px]"><MessageSquareText className="mt-0.5 size-4 shrink-0" /> {o.note}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[15px] font-bold tabular-nums">{egp(o.total)} <span className="text-[12px] font-normal text-ink-3">{o.payment === "cash" ? "كاش" : "مدفوع"}</span></span>
                      <button onClick={() => toast("بنطبع الفاتورة على طابعة المطبخ")} aria-label="اطبع" className="tap grid size-9 place-items-center rounded-full bg-paper text-ink-2"><Printer className="size-4.5" /></button>
                    </div>
                    {NEXT_LABEL[o.status] && <Button block className="mt-3" variant={o.status === "preparing" ? "primary" : "secondary"} onClick={() => advance(o.id)}>{NEXT_LABEL[o.status]}</Button>}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </main>
  );
}

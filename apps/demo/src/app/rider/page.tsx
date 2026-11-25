"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Ban, Banknote, CalendarClock, Check, ChevronDown, ClipboardList, Clock, Map, MapPin, MessageCircle, MessageSquareText, Navigation, Phone, Power, Store as StoreIcon, TimerReset } from "lucide-react";
import { useRider, type Job } from "@/lib/store/rider";
import { SHIFT_RULES } from "@/lib/data/admin";
import { storeById } from "@/lib/data/stores";
import { useNow } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { Photo, StoreLogo } from "@/components/ui/bits";
import { egp, cx, mmss } from "@/lib/format";
import { ring } from "@/lib/sound";

const OrderMap = dynamic(() => import("@/components/customer/order-map"), { ssr: false, loading: () => <div className="h-full animate-pulse bg-pen-50" /> });
const OFFER_S = 25;
const IDLE: [number, number] = [29.3084, 30.8428];
const hm = (ts: number) => new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function RiderHome() {
  const r = useRider();
  const { online, job, offer, decline, accept, next, trips, shifts, activeShift, suspendedUntil, notices } = r;
  const now = useNow(1000);
  const [left, setLeft] = useState(OFFER_S);
  const [checked, setChecked] = useState<number[]>([]);
  const [leg, setLeg] = useState(0);
  const [done, setDone] = useState<null | { fee: number; collect: number }>(null);
  const [details, setDetails] = useState(false);
  const today = trips.filter((t) => now - t.at < 24 * 3600_000 && t.status !== "cancelled");
  const earned = today.reduce((s, t) => s + t.fee + t.tip, 0);

  const shift = shifts.find((s) => s.id === activeShift) ?? null;
  const nextShift = shift ?? [...shifts].sort((a, b) => a.start - b.start).find((s) => s.end > now) ?? null;
  const unlockAt = nextShift ? nextShift.start - SHIFT_RULES.unlockBeforeMin * 60_000 : Infinity;
  const canStart = !!nextShift && now >= unlockAt;
  const ended = !!shift && now > shift.end;
  const suspended = now < suspendedUntil;

  // Warnings / suspensions arrive as notices
  const seen = useRef(notices[0]?.id);
  useEffect(() => {
    const n = notices[0];
    if (!n || n.id === seen.current) return;
    seen.current = n.id;
    if (n.tone === "bad") toast.error(n.text, { duration: 6000 });
    else if (n.tone === "warn") toast.warning(n.text, { duration: 5000 });
    else toast.success(n.text);
  }, [notices]);

  useEffect(() => {
    if (!online || job || !shift || ended || suspended) return;
    const t = setTimeout(() => { offer(); ring(); }, 3500);
    return () => clearTimeout(t);
  }, [online, job, offer, shift, ended, suspended]);

  useEffect(() => {
    if (job?.stage !== "offer") return;
    const tick = () => {
      const l = Math.max(0, OFFER_S - Math.floor((Date.now() - job.offeredAt) / 1000));
      setLeft(l);
      if (l === 0) decline(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job?.stage, job?.offeredAt, decline]);

  useEffect(() => {
    setChecked([]);
    setLeg(0);
    if (job?.stage !== "toStore" && job?.stage !== "toCustomer") return;
    const t = setInterval(() => setLeg((p) => Math.min(1, p + 0.02)), 300);
    return () => clearInterval(t);
  }, [job?.stage]);

  const store = job ? storeById(job.storeId) : undefined;
  const phase = !job || job.stage === "offer" ? "hidden" : job.stage === "toStore" ? "toStore" : job.stage === "atStore" ? "atStore" : job.stage === "toCustomer" ? "toHome" : "done";
  const status = !shift ? "لا يعمل" : ended ? "النوبة خلصت" : suspended ? "إيقاف مؤقت" : job ? (job.stage === "offer" ? "عندك عرض مشوار" : "في مشوار") : "متاح، بندوّرلك على طلب";

  return (
    <main className="relative h-[calc(100dvh-80px)] overflow-hidden">
      <div className="absolute inset-0">
        {job && store ? (
          <OrderMap key={job.id} store={job.from} home={job.to} progress={leg} phase={phase as never} mono={store.mono} height="100%" padBottom={330} />
        ) : (
          <OrderMap key="idle" store={IDLE} home={[IDLE[0] + 0.004, IDLE[1] + 0.006]} progress={0} phase="hidden" mono={{ letter: "ل", bg: "#f55905", fg: "#fff" }} height="100%" padBottom={330} />
        )}
      </div>

      {/* Top status */}
      <div className="absolute inset-x-0 top-0 z-[500] p-3">
        <div className="flex items-center gap-3 rounded-2xl bg-sheet/95 p-3 shadow-lift backdrop-blur">
          <span className={cx("size-3 rounded-full", shift && !ended && !suspended ? "bg-stamp" : suspended || ended ? "bg-void" : "bg-ink-3")} style={shift && !ended && !suspended ? { animation: "pulse-ring 1.6s infinite" } : undefined} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{status}</p>
            <p className="truncate text-[12.5px] text-ink-3">{shift ? `النوبة لحد ${hm(shift.end)} • ` : ""}النهارده: {egp(earned)} • {today.length} مشوار</p>
          </div>
          {shift && !job && !ended && (
            <button onClick={() => { r.endShift(); toast("قفلت النوبة. شكراً يا كابتن"); }} className="tap inline-flex h-10 items-center gap-1.5 rounded-xl bg-void-50 px-3 text-[13.5px] font-semibold text-void">
              <Power className="size-4" /> إنهاء
            </button>
          )}
        </div>
        {suspended && (
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-void p-3 text-white shadow-lift">
            <Ban className="size-5 shrink-0" />
            <p className="flex-1 text-[13.5px]">إيقاف مؤقت بسبب تخطي الطلبات. هترجع تستقبل طلبات بعد <b className="tabular-nums">{mmss(Math.ceil((suspendedUntil - now) / 1000))}</b></p>
          </div>
        )}
      </div>

      {/* Bottom card */}
      <div className="absolute inset-x-0 bottom-0 z-[500] p-3">
        <AnimatePresence mode="wait">
          {!shift && !job && !done && (
            <motion.div key="off" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <p className="text-[18px] font-bold">نوبة عمل محجوزة</p>
              {nextShift ? (
                <div className="mt-3 rounded-2xl border border-rule p-3">
                  <p className="text-[14px] font-semibold text-stamp">
                    {now < nextShift.start ? `ستبدأ في ${Math.max(1, Math.ceil((nextShift.start - now) / 60_000))} دقيقة` : "النوبة بدأت"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold tabular-nums" dir="rtl"><CalendarClock className="size-4 text-ink-3" /> {hm(nextShift.start)} – {hm(nextShift.end)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-ink-2"><MapPin className="size-4 text-ink-3" /> {nextShift.zone}</p>
                  <button onClick={() => toast("بنفتح منطقة النوبة على الخريطة")} className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-pen"><Map className="size-4" /> عرض على الخريطة</button>
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-ink-2">مفيش نوبات محجوزة. الإدارة بتحدد النوبات.</p>
              )}
              <Button block size="lg" className="mt-4 !bg-ink" disabled={!canStart} onClick={() => { r.startShift(nextShift!.id); toast.success("بدأت النوبة. بالتوفيق يا كابتن"); }}>
                <Power className="size-5" /> بدء نوبة العمل
              </Button>
              {!canStart && nextShift && <p className="mt-2 text-center text-[12.5px] text-ink-3">الزرار بيفتح قبل النوبة بنص ساعة ({hm(unlockAt)})</p>}
            </motion.div>
          )}

          {shift && ended && !job && (
            <motion.div key="ended" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <p className="flex items-center gap-2 text-[18px] font-bold"><Clock className="size-5 text-void" /> نوبتك خلصت الساعة {hm(shift.end)}</p>
              <p className="mt-1 text-[14px] text-ink-2">مش هيوصلك طلبات جديدة غير لو بلّغت إنك هتمد النوبة.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="lg" variant="outline" onClick={() => { r.endShift(); toast("قفلت النوبة"); }}>اقفل</Button>
                <Button size="lg" onClick={r.extendShift}><TimerReset className="size-5" /> مد ساعة</Button>
              </div>
            </motion.div>
          )}

          {job?.stage === "offer" && store && (
            <motion.div key="offer" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-ink-3">مشوار جديد • {job.km} كم</p>
                  <p className="mt-1 text-[32px] font-bold leading-[1.25] tabular-nums text-stamp">{egp(job.fee)}</p>
                  <p className="mt-1 text-[12.5px] text-ink-2">ده اللي هتاخده بالظبط + أي إكرامية</p>
                </div>
                <div className="relative grid size-14 place-items-center">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-rule)" strokeWidth="3" /><circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-pen)" strokeWidth="3" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - left / OFFER_S)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} /></svg>
                  <span className="text-[17px] font-bold tabular-nums">{left}</span>
                </div>
              </div>
              <ol className="mt-4 space-y-3 border-t-2 border-dotted border-leader pt-4">
                <li className="flex items-center gap-3"><StoreLogo store={store} size={34} /><span className="flex-1"><span className="block text-[15px] font-semibold">{job.storeName}</span><span className="text-[12.5px] text-ink-3">{job.storeArea}</span></span></li>
                <li className="flex items-center gap-3"><span className="grid size-[34px] place-items-center rounded-[30%] bg-pen text-white"><MapPin className="size-4.5" /></span><span className="flex-1"><span className="block text-[15px] font-semibold">{job.customerArea}</span><span className="text-[12.5px] text-ink-3">{job.customerAddress}</span></span></li>
              </ol>
              {job.collect > 0 ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-marker-soft p-2.5 text-[13.5px]"><Banknote className="size-4.5" /> هتحصّل كاش {egp(job.collect)} من العميل</p> : <p className="mt-3 rounded-xl bg-stamp-50 p-2.5 text-[13.5px] text-stamp">الطلب مدفوع، مفيش تحصيل</p>}
              {r.skips > 0 && <p className="mt-2 text-[12.5px] text-void">تخطيت {r.skips} طلب ورا بعض • {SHIFT_RULES.skipsSuspend} = إيقاف مؤقت</p>}
              <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                <Button variant="outline" size="lg" onClick={() => decline()}>تخطّي</Button>
                <Button size="lg" onClick={accept}>اقبل المشوار</Button>
              </div>
            </motion.div>
          )}

          {job && job.stage !== "offer" && store && (
            <motion.div key={job.stage} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <ol className="mb-4 flex gap-1.5" aria-label="مراحل المشوار">
                {["toStore", "atStore", "toCustomer", "atCustomer"].map((s, i) => <li key={s} className={cx("h-1.5 flex-1 rounded-full", ["toStore", "atStore", "toCustomer", "atCustomer"].indexOf(job.stage) >= i ? "bg-pen" : "bg-rule")} />)}
              </ol>
              <button onClick={() => setDetails(true)} className="tap mb-3 flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2 text-[14px] font-medium">
                <ClipboardList className="size-4.5 text-pen" /> <span className="flex-1 text-start">تفاصيل الطلب #{job.number}</span> <ChevronDown className="size-4 -rotate-90 text-ink-3 rtl:rotate-90" />
              </button>
              {job.stage === "toStore" && (
                <>
                  <p className="text-[13px] text-ink-3">روح استلم من</p>
                  <p className="text-[20px] font-bold">{job.storeName}</p>
                  <p className="text-[14px] text-ink-2">{job.storeAddress} • قول للمحل طلب رقم <b className="tabular-nums text-ink">#{job.number}</b></p>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <Button variant="secondary" size="lg" onClick={() => toast("بنفتح الخريطة في جوجل مابس")}><Navigation className="size-5" /></Button>
                    <Button size="lg" onClick={next}><StoreIcon className="size-5" /> وصلت المحل</Button>
                  </div>
                </>
              )}
              {job.stage === "atStore" && (
                <>
                  <p className="text-[20px] font-bold">راجع الطلب قبل ما تستلم</p>
                  <ul className="mt-3 space-y-2">
                    {job.items.map((it, i) => {
                      const on = checked.includes(i);
                      return (
                        <li key={i}><button role="checkbox" aria-checked={on} onClick={() => setChecked(on ? checked.filter((c) => c !== i) : [...checked, i])} className={cx("tap flex w-full items-center gap-3 rounded-2xl p-3 text-start ring-1 ring-inset", on ? "bg-stamp-50 ring-stamp" : "ring-rule")}>
                          <span className={cx("grid size-6 place-items-center rounded-md border-2", on ? "border-stamp bg-stamp text-white" : "border-leader")}>{on && <Check className="size-4" strokeWidth={3} />}</span>
                          <span className="flex-1 text-[15px]"><b className="tabular-nums">{it.qty}×</b> {it.name}</span>
                        </button></li>
                      );
                    })}
                  </ul>
                  {job.storePay > 0 && <p className="mt-3 flex items-center justify-between rounded-xl bg-pen-50 p-2.5 text-[14px] font-semibold text-pen"><span>ادفع نقداً للبائع</span><span className="tabular-nums">{egp(job.storePay)}</span></p>}
                  <Button block size="lg" className="mt-4" disabled={checked.length < job.items.length} onClick={next}>خارج للتوصيل</Button>
                </>
              )}
              {job.stage === "toCustomer" && (
                <>
                  <p className="text-[13px] text-ink-3">وصّل لـ</p>
                  <p className="text-[20px] font-bold">{job.customer}</p>
                  <p className="text-[14px] text-ink-2">{job.customerArea}، {job.customerAddress}</p>
                  <div className="mt-4 grid grid-cols-[auto_auto_1fr] gap-2">
                    <Button variant="secondary" size="lg" onClick={() => toast("بنتصل بالعميل برقم مخفي")} aria-label="اتصل بالعميل"><Phone className="size-5" /></Button>
                    <Button variant="secondary" size="lg" onClick={() => toast("العميل: «أنا مستني تحت»")} aria-label="شات مع العميل"><MessageCircle className="size-5" /></Button>
                    <Button size="lg" onClick={next}>وصلت للعميل</Button>
                  </div>
                </>
              )}
              {job.stage === "atCustomer" && (
                <>
                  <p className="text-[13px] text-ink-3">{job.collect > 0 ? "حصّل من العميل" : "الطلب مدفوع"}</p>
                  <p className="text-[36px] font-bold leading-tight tabular-nums">{job.collect > 0 ? egp(job.collect) : "سلّم وبس"}</p>
                  <Button block size="lg" className="mt-4 !bg-stamp" onClick={() => { setDone({ fee: job.fee, collect: job.collect }); next(); setTimeout(() => setDone(null), 2600); }}><Check className="size-5" /> سلّمت الطلب</Button>
                </>
              )}
            </motion.div>
          )}

          {done && !job && (
            <motion.div key="done" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center rounded-[22px] bg-sheet p-6 text-center shadow-lift">
              <Stamp tone="stamp" size="lg" animate>اتسلم</Stamp>
              <p className="mt-5 text-[28px] font-bold tabular-nums text-stamp">+{egp(done.fee)}</p>
              <p className="text-[14px] text-ink-2">نزلت في أرباحك{done.collect ? ` • معاك ${egp(done.collect)} كاش` : ""}</p>
            </motion.div>
          )}

          {shift && !ended && !job && !done && (
            <motion.div key="wait" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex items-center gap-3 rounded-[22px] bg-sheet p-4 shadow-lift">
              <span className="relative grid size-10 place-items-center"><span className={cx("absolute inset-0 rounded-full", suspended ? "bg-void/20" : "animate-ping bg-stamp/30")} /><span className={cx("size-3 rounded-full", suspended ? "bg-void" : "bg-stamp")} /></span>
              <div className="flex-1"><p className="text-[15px] font-semibold">{suspended ? "موقوف مؤقتاً" : "بندوّرلك على مشوار قريب"}</p><p className="text-[12.5px] text-ink-3">نوبتك {hm(shift.start)} – {hm(shift.end)} • فاضل {Math.max(0, Math.ceil((shift.end - now) / 60_000))} دقيقة</p></div>
              <button onClick={r.extendShift} className="tap rounded-xl bg-pen-50 px-3 py-2 text-[12.5px] font-semibold text-pen">مد النوبة</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {job && <JobDetails job={job} open={details} onOpenChange={setDetails} onOut={job.stage === "atStore" ? () => { setDetails(false); next(); } : undefined} />}
    </main>
  );
}

/** The order as the rider sees it: store, customer (call / chat / WhatsApp), products, cash to pay and to collect. */
function JobDetails({ job, open, onOpenChange, onOut }: { job: Job; open: boolean; onOpenChange: (v: boolean) => void; onOut?: () => void }) {
  const [showItems, setShowItems] = useState(false);
  const itemsTotal = job.items.reduce((a, i) => a + i.price, 0);
  const count = job.items.reduce((a, i) => a + i.qty, 0);
  const wa = `https://wa.me/2${job.customerPhone}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`تفاصيل الطلب #${job.number}`}>
      <div className="space-y-3 bg-paper px-4 pb-6 pt-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[16px] font-bold">البائع</p>
              <p className="text-[15px] text-ink-2">{job.storeName}</p>
            </div>
            <button onClick={() => toast("بنفتح موقع المحل على الخريطة")} className="inline-flex items-center gap-1 text-[14px] font-semibold text-pen"><MapPin className="size-4" /> عرض الموقع</button>
          </div>
          <p className="mt-3 text-[16px] font-bold">عنوان البائع</p>
          <p className="text-[15px] text-ink-2">{job.storeAddress}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[17px] font-bold">{job.customer}</p>
            <span className="flex items-center gap-4 text-ink">
              <button aria-label="اتصل بالعميل" onClick={() => toast("بنتصل بالعميل برقم مخفي")}><Phone className="size-5.5" /></button>
              <button aria-label="رسالة للعميل" onClick={() => toast("العميل: «أنا مستني تحت»")}><MessageSquareText className="size-5.5" /></button>
              <a aria-label="واتساب العميل" href={wa} target="_blank" rel="noreferrer" className="text-stamp"><MessageCircle className="size-5.5" /></a>
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[15px] text-ink-2">{job.customerArea}، {job.customerAddress}</p>
            <button onClick={() => toast("بنفتح موقع العميل على الخريطة")} className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-pen"><MapPin className="size-4" /> عرض الموقع</button>
          </div>
        </Card>
        <Card>
          <button onClick={() => setShowItems(!showItems)} className="flex w-full items-center justify-between" aria-expanded={showItems}>
            <span className="text-[17px] font-bold">المنتجات</span>
            <span className="flex items-center gap-2 text-end">
              <span className="text-[14px] font-semibold text-pen"><span className="block">{count} منتج</span><span className="block tabular-nums">{egp(itemsTotal)}</span></span>
              <ChevronDown className={cx("size-5 text-ink-3 transition-transform", showItems && "rotate-180")} />
            </span>
          </button>
          {showItems && (
            <ul className="mt-3 space-y-2.5 border-t border-rule pt-3 text-[14.5px]">
              {job.items.map((i, k) => (
                <li key={k} className="flex items-center gap-3">
                  {/* [Client] the product's photo shows on each line */}
                  {i.img && <Photo src={i.img} alt="" className="size-12 shrink-0 rounded-xl ring-1 ring-rule" sizes="48px" />}
                  <span className="min-w-0 flex-1"><b className="tabular-nums">{i.qty}×</b> {i.name}</span>
                  <span className="tabular-nums text-ink-2">{egp(i.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {job.storePay > 0 && (
          <Card><div className="flex items-center justify-between"><span className="text-[15px] font-semibold text-pen">ادفع نقداً للبائع</span><span className="text-[17px] font-bold tabular-nums text-pen">{egp(job.storePay)}</span></div></Card>
        )}
        <Card>
          <p className="text-[17px] font-bold">المبلغ</p>
          <div className="mt-2 flex items-center justify-between"><span className="text-[15px] text-ink-2">{job.collect > 0 ? "تحصيل النقود" : "مدفوع أونلاين"}</span><span className="text-[17px] font-bold tabular-nums">{egp(job.collect)}</span></div>
        </Card>
        {onOut && <Button block size="lg" onClick={onOut}>خارج للتوصيل</Button>}
      </div>
    </Sheet>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[18px] bg-sheet p-4 shadow-sheet">{children}</section>;
}

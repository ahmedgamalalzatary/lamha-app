"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Banknote, Check, MapPin, MessageCircle, Navigation, Phone, Power, Store as StoreIcon } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { storeById } from "@/lib/data/stores";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { StoreLogo } from "@/components/ui/bits";
import { egp, cx } from "@/lib/format";
import { ring } from "@/lib/sound";

const OrderMap = dynamic(() => import("@/components/customer/order-map"), { ssr: false, loading: () => <div className="h-full animate-pulse bg-pen-50" /> });
const OFFER_S = 25;
const IDLE: [number, number] = [29.3084, 30.8428];

export default function RiderHome() {
  const { online, setOnline, job, offer, decline, accept, next, trips } = useRider();
  const [left, setLeft] = useState(OFFER_S);
  const [checked, setChecked] = useState<number[]>([]);
  const [leg, setLeg] = useState(0);
  const [done, setDone] = useState<null | { fee: number; collect: number }>(null);
  const today = trips.filter((t) => Date.now() - t.at < 24 * 3600_000);
  const earned = today.reduce((s, t) => s + t.fee + t.tip, 0);

  useEffect(() => {
    if (!online || job) return;
    const t = setTimeout(() => { offer(); ring(); }, 3500);
    return () => clearTimeout(t);
  }, [online, job, offer]);

  useEffect(() => {
    if (job?.stage !== "offer") return;
    const tick = () => {
      const l = Math.max(0, OFFER_S - Math.floor((Date.now() - job.offeredAt) / 1000));
      setLeft(l);
      if (l === 0) decline();
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
          <span className={cx("size-3 rounded-full", online ? "bg-stamp" : "bg-ink-3")} style={online ? { animation: "pulse-ring 1.6s infinite" } : undefined} />
          <div className="flex-1">
            <p className="text-[15px] font-semibold">{online ? (job ? (job.stage === "offer" ? "عندك عرض مشوار" : "في مشوار") : "متاح، بندوّرلك على طلب") : "إنت أوفلاين"}</p>
            <p className="text-[12.5px] text-ink-3">النهارده: {egp(earned)} • {today.length} مشوار</p>
          </div>
          {!job && (
            <button onClick={() => { setOnline(!online); toast(online ? "قفلت الشغل. شكراً يا كابتن" : "إنت أونلاين"); }} className={cx("tap inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold", online ? "bg-void-50 text-void" : "bg-stamp text-white")}>
              <Power className="size-4" /> {online ? "اقفل" : "ابدأ"}
            </button>
          )}
        </div>
      </div>

      {/* Bottom card */}
      <div className="absolute inset-x-0 bottom-0 z-[500] p-3">
        <AnimatePresence mode="wait">
          {!online && !job && !done && (
            <motion.div key="off" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <p className="text-[18px] font-bold">جاهز تبدأ؟</p>
              <p className="mt-1 text-[14px] text-ink-2">الطلبات كتير في الحادقة والمسلة دلوقتي. متوسط المشوار {egp(29)}.</p>
              <Button block size="lg" className="mt-4 !bg-stamp" onClick={() => setOnline(true)}><Power className="size-5" /> ابدأ الشغل</Button>
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
              <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                <Button variant="outline" size="lg" onClick={decline}>تخطّي</Button>
                <Button size="lg" onClick={accept}>اقبل المشوار</Button>
              </div>
            </motion.div>
          )}

          {job && job.stage !== "offer" && store && (
            <motion.div key={job.stage} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="rounded-[22px] bg-sheet p-5 shadow-lift">
              <ol className="mb-4 flex gap-1.5" aria-label="مراحل المشوار">
                {["toStore", "atStore", "toCustomer", "atCustomer"].map((s, i) => <li key={s} className={cx("h-1.5 flex-1 rounded-full", ["toStore", "atStore", "toCustomer", "atCustomer"].indexOf(job.stage) >= i ? "bg-pen" : "bg-rule")} />)}
              </ol>
              {job.stage === "toStore" && (
                <>
                  <p className="text-[13px] text-ink-3">روح استلم من</p>
                  <p className="text-[20px] font-bold">{job.storeName}</p>
                  <p className="text-[14px] text-ink-2">{job.storeArea} • قول للمحل طلب رقم <b className="tabular-nums text-ink">#{job.number}</b></p>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <Button variant="secondary" size="lg" onClick={() => toast("بنفتح الخريطة في جوجل مابس")}><Navigation className="size-5" /></Button>
                    <Button size="lg" onClick={next}><StoreIcon className="size-5" /> وصلت المحل</Button>
                  </div>
                </>
              )}
              {job.stage === "atStore" && (
                <>
                  <p className="text-[20px] font-bold">راجع الطلب قبل ما تستلم</p>
                  <p className="text-[13.5px] text-ink-2">علّم على كل صنف وإنت بتتأكد منه. ده بيقلل الأخطاء.</p>
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
                  <Button block size="lg" className="mt-4" disabled={checked.length < job.items.length} onClick={next}>استلمت الطلب</Button>
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
                  <Button block size="lg" className="mt-4 !bg-stamp" onClick={() => { setDone({ fee: job.fee, collect: job.collect }); next(); setOnline(true); setTimeout(() => setDone(null), 2600); }}><Check className="size-5" /> سلّمت الطلب</Button>
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

          {online && !job && !done && (
            <motion.div key="wait" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex items-center gap-3 rounded-[22px] bg-sheet p-4 shadow-lift">
              <span className="relative grid size-10 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-stamp/30" /><span className="size-3 rounded-full bg-stamp" /></span>
              <div><p className="text-[15px] font-semibold">بندوّرلك على مشوار قريب</p><p className="text-[12.5px] text-ink-3">خليك قريب من الحادقة، الطلبات هناك أكتر</p></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

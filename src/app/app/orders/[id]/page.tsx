"use client";
import { use, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Camera, Check, ChevronRight, FastForward, Headset, MessageCircle, Phone, RotateCcw, Star, PencilLine, X } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { storeById, AREAS } from "@/lib/data/stores";
import { orderState, STATUS_TEXT, FLOW, STEP_MS } from "@/lib/order-sim";
import { lineTotal, quote } from "@/lib/pricing";
import { useNow } from "@/lib/hooks";
import type { CartLine } from "@/lib/types";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FlipNumber, Photo, Stepper, StoreLogo, Empty } from "@/components/ui/bits";
import { ChatSheet } from "@/components/customer/chat-sheet";
import { egp, clock, mmss, cx, dateShort } from "@/lib/format";

const OrderMap = dynamic(() => import("@/components/customer/order-map"), { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-pen-50" /> });

const RIDER = { name: "محمود جمال", rating: 4.9, trips: 1240, plate: "ف ي ق 482", vehicle: "موتوسيكل" };
const STEP_LABEL: Record<string, string> = { placed: "اتبعت للمحل", accepted: "المحل أكد", preparing: "بيتجهز", pickedUp: "الطيار استلم", delivered: "وصل" };

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const now = useNow(1000);
  const s = useCustomer();
  const order = s.orders.find((o) => o.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [chat, setChat] = useState<null | "rider" | "support">(null);
  const st = order ? orderState(order, now) : null;

  useEffect(() => {
    if (st?.status === "delivered" && order && !order.rated && now - order.placedAt < 30 * 60_000) {
      const t = setTimeout(() => setRateOpen(true), 1600);
      return () => clearTimeout(t);
    }
  }, [st?.status, order, now]);

  if (!order || !st) {
    return <main className="min-h-dvh"><Empty icon={<X className="size-8" />} title="مش لاقيين الطلب ده" action={<Button onClick={() => router.push("/app/orders")}>طلباتي</Button>} /></main>;
  }

  const store = storeById(order.storeId);
  const courier = order.kind === "courier";
  const mono = store?.mono ?? { letter: "م", bg: "#1c2fa8", fg: "#fff" };
  const addr = s.addresses.find((a) => a.label === order.addressLabel);
  const home = (addr?.coords ?? (courier ? AREAS[order.courier!.to.split("،")[0]] : undefined) ?? [29.3168, 30.8402]) as [number, number];
  const from = (store?.coords ?? (courier ? AREAS[order.courier!.from.split("،")[0]] : undefined) ?? [29.306, 30.843]) as [number, number];
  const phase = st.status === "pickedUp" ? "toHome" : st.status === "preparing" ? (st.stepProgress < 0.6 ? "toStore" : "atStore") : st.status === "delivered" ? "done" : st.status === "accepted" ? "toStore" : "hidden";
  const mapProgress = st.status === "preparing" ? Math.min(1, st.stepProgress / 0.6) : st.status === "accepted" ? 0 : st.stepProgress;
  const live = st.status !== "delivered" && st.status !== "cancelled";
  const arriveAt = now + st.remainingMinutes * 60_000;
  const refunded = new Set(order.refunds.map((r) => r.lineKey));
  const refundTotal = order.refunds.reduce((a, r) => a + r.amount, 0);
  const pickup = order.addressLabel === "استلام من المحل";

  // When each step was stamped (demo clock)
  const stepAt = (i: number) => order.placedAt - order.offsetMs + FLOW.slice(0, i).reduce((a, k) => a + STEP_MS[k], 0);

  return (
    <main className="min-h-dvh pb-10">
      <div className="relative">
        {live && !pickup ? (
          <OrderMap store={from} home={home} progress={mapProgress} phase={phase as never} mono={mono} />
        ) : (
          <div className={cx("h-[150px]", st.status === "cancelled" ? "bg-void-50" : "bg-pen")} />
        )}
        <div className="absolute inset-x-0 top-0 z-[500] flex items-center justify-between p-2">
          <button aria-label="رجوع" onClick={() => router.push("/app/orders")} className="tap grid size-10 place-items-center rounded-full bg-sheet shadow-sheet"><ChevronRight className="size-6" /></button>
          <button onClick={() => setChat("support")} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-sheet px-3.5 text-[14px] font-medium shadow-sheet"><Headset className="size-4.5 text-pen" /> مساعدة</button>
        </div>
      </div>

      <div className="relative z-10 -mt-6 px-4">
        <Receipt top>
          {/* ETA block */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] text-ink-3">طلب #{order.number} • {courier ? "مشوار" : store?.name}</p>
              <h1 className="mt-0.5 text-[20px] font-bold leading-tight">{STATUS_TEXT[st.status].title}</h1>
              <p className="text-[14px] text-ink-2">{st.status === "delivered" ? `اتسلم ${dateShort(order.placedAt)}` : STATUS_TEXT[st.status].line}</p>
            </div>
            <Stamp key={st.status} tone={st.status === "cancelled" ? "void" : st.status === "placed" ? "pen" : "stamp"} animate className="mt-1 shrink-0">
              {STATUS_TEXT[st.status].stamp}
            </Stamp>
          </div>

          {live && (
            <>
              <div className="mt-4 flex items-end gap-3">
                <div className="flex items-baseline gap-2 text-pen">
                  <FlipNumber value={st.remainingMinutes} className="font-hand text-[64px] font-bold leading-[0.8]" />
                  <span className="text-[16px] font-semibold">دقيقة</span>
                </div>
                <p className="mb-1 text-[13.5px] text-ink-2">{pickup ? "يكون جاهز" : "يوصلك"} حوالي <b className="text-ink">{clock(arriveAt)}</b></p>
              </div>
              {/* Time bar: its length is the exact time that has passed */}
              <div className="relative mt-4 h-3 rounded-full bg-pen-50" role="progressbar" aria-label="الوقت" aria-valuenow={Math.round(st.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="absolute inset-y-0 start-0 rounded-full bg-pen transition-[width] duration-1000 ease-linear" style={{ width: `${st.progress * 100}%` }} />
                {FLOW.slice(1).map((k, i) => {
                  const at = FLOW.slice(0, i + 1).reduce((a, x) => a + STEP_MS[x], 0) / FLOW.reduce((a, x) => a + STEP_MS[x], 0);
                  return <span key={k} className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-sheet ring-2 ring-pen/40" style={{ insetInlineStart: `calc(${at * 100}% - 4px)` }} />;
                })}
              </div>
            </>
          )}

          {/* Stamped steps */}
          {st.status !== "cancelled" && (
            <ol className="mt-5 space-y-2.5">
              {[...FLOW, "delivered" as const].map((k, i) => {
                const done = i < st.stepIndex || st.status === "delivered";
                const current = i === st.stepIndex && st.status !== "delivered";
                return (
                  <li key={k} className={cx("flex items-center gap-3 text-[14.5px]", !done && !current && "text-ink-3")}>
                    <span className={cx("grid size-6 shrink-0 place-items-center rounded-full", done ? "bg-stamp text-white" : current ? "bg-pen text-white" : "border-2 border-dotted border-leader")}>
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : current ? <span className="size-2 rounded-full bg-white" style={{ animation: "pulse-ring 1.4s infinite" }} /> : null}
                    </span>
                    <span className={cx("flex-1", current && "font-semibold text-ink")}>{pickup && k === "pickedUp" ? "جاهز للاستلام" : STEP_LABEL[k]}</span>
                    {(done || current) && <span className="text-[12.5px] text-ink-3 tabular-nums">{clock(stepAt(i))}</span>}
                  </li>
                );
              })}
            </ol>
          )}

          {st.status === "cancelled" && (
            <div className="mt-4 rounded-2xl bg-void-50 p-3 text-[14px] leading-relaxed">
              اتلغى {order.cancelledAt && `الساعة ${clock(order.cancelledAt)}`} من غير أي رسوم.
              {order.quote.walletApplied > 0 ? ` رجعنا ${egp(order.quote.walletApplied)} لمحفظتك.` : order.payment === "card" ? " الفلوس رجعت للكارت." : " مفيش أي مبلغ اتخصم منك."}
            </div>
          )}
        </Receipt>
      </div>

      {/* Actions by state */}
      <div className="mt-4 space-y-3 px-4">
        {st.canCancel && (
          <div className="rounded-[18px] bg-sheet p-4 shadow-sheet">
            <p className="text-[14.5px] font-medium">غيّرت رأيك؟</p>
            <p className="text-[13px] text-ink-2">تقدر تلغي أو تعدّل ببلاش لحد ما المحل يأكد • فاضل <b className="tabular-nums text-ink">{mmss(st.cancelSecondsLeft)}</b></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {!courier && <Button variant="secondary" onClick={() => setEditOpen(true)}><PencilLine className="size-4.5" /> عدّل الطلب</Button>}
              <Button variant="danger" onClick={() => setCancelOpen(true)} className={courier ? "col-span-2" : ""}><X className="size-4.5" /> الغي ببلاش</Button>
            </div>
          </div>
        )}

        {live && !st.canCancel && !pickup && (st.status === "pickedUp" || st.status === "preparing") && (
          <div className="flex items-center gap-3 rounded-[18px] bg-sheet p-3 shadow-sheet">
            <Photo src="/img/scooter1.jpg" alt="" className="size-12 shrink-0 rounded-full" sizes="48px" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{RIDER.name}</p>
              <p className="flex items-center gap-1 whitespace-nowrap text-[12.5px] text-ink-2"><Star className="size-3.5 fill-marker text-[#e0b400]" /> {RIDER.rating} • <span className="rounded bg-paper px-1.5 font-medium text-ink">{RIDER.plate}</span></p>
            </div>
            <button onClick={() => setChat("rider")} aria-label="كلّم الطيار شات" className="tap grid size-11 place-items-center rounded-full bg-pen-50 text-pen"><MessageCircle className="size-5" /></button>
            <a href="tel:0000" onClick={(e) => { e.preventDefault(); toast("بنوصلك بالطيار برقم مخفي عشان خصوصيتك"); }} aria-label="اتصل بالطيار" className="tap grid size-11 place-items-center rounded-full bg-stamp text-white"><Phone className="size-5" /></a>
          </div>
        )}

        {st.status === "delivered" && (
          <div className="grid grid-cols-2 gap-2">
            {!courier && <Button variant="secondary" onClick={() => { s.reorder(order.id); router.push("/app/cart"); }}><RotateCcw className="size-4.5" /> اطلبه تاني</Button>}
            <Button variant="outline" onClick={() => setReportOpen(true)} className={courier ? "col-span-2" : ""}>في مشكلة؟</Button>
            {!order.rated && <Button className="col-span-2" onClick={() => setRateOpen(true)}><Star className="size-4.5" /> قيّم الطلب وخد 10 نقط</Button>}
          </div>
        )}
      </div>

      {/* The receipt itself */}
      <div className="mt-5 px-4">
        <Receipt>
          <div className="flex items-center gap-3">
            {store ? <StoreLogo store={store} size={36} /> : null}
            <div className="flex-1">
              <p className="text-[15px] font-semibold">الفاتورة</p>
              <p className="text-[12.5px] text-ink-3">{order.addressLabel} • {order.addressText}</p>
            </div>
          </div>
          <Perf />
          <ul className="space-y-1.5 text-[14.5px]">
            {order.lines.map((l) => {
              const r = refunded.has(l.key);
              return (
                <li key={l.key} className="relative">
                  <div className={cx("flex items-baseline", r && "text-ink-3")}>
                    <span className={cx(r && "line-through decoration-void decoration-2")}>{l.qty}× {l.name}</span>
                    <span className="leader" />
                    <span className="tabular-nums">{egp(lineTotal(l))}</span>
                  </div>
                  {l.choices.length > 0 && <p className="text-[12px] text-ink-3">{l.choices.map((c) => c.name).join("، ")}</p>}
                  {r && <Stamp tone="void" size="sm" className="absolute -top-1 start-1/3 !text-[13px]" animate>مسترد</Stamp>}
                </li>
              );
            })}
          </ul>
          <Perf />
          <div className="text-[14px]">
            {order.quote.lines.filter((l) => l.key !== "subtotal").map((l) => <Row key={l.key} label={l.label} amount={l.amount} struck={l.struck} tone={l.amount < 0 ? "stamp" : "ink"} />)}
          </div>
          <div className="mt-1 flex items-baseline text-[17px] font-bold"><span className="marked">الإجمالي</span><span className="leader" /><span className="tabular-nums">{egp(order.quote.total)}</span></div>
          {order.quote.walletApplied > 0 && <Row className="mt-1 text-[14px]" label="اتدفع من المحفظة" amount={order.quote.walletApplied} tone="stamp" />}
          {refundTotal > 0 && <Row className="text-[14px]" label="رجع لمحفظتك" amount={refundTotal} tone="stamp" bold />}
          <p className="mt-2 text-[12.5px] text-ink-3">الدفع: {{ cash: "كاش عند الاستلام", card: "كارت", wallet: "محفظة لمحة" }[order.payment]}{order.scheduledFor ? ` • مجدول ${order.scheduledFor}` : ""}</p>
        </Receipt>
      </div>

      {live && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => s.skipOrder(order.id)} className="tap inline-flex items-center gap-1.5 rounded-full bg-desk px-3 py-1.5 text-[12px] text-ink-2">
            <FastForward className="size-3.5" /> تقديم الحالة (للعرض)
          </button>
        </div>
      )}

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen} title="تلغي الطلب؟" description="لسه المحل مأكدش، فالإلغاء ببلاش ومفيش أي رسوم.">
        <div className="grid gap-2.5 px-5 pb-6 pt-2">
          <Button variant="danger" size="lg" block onClick={() => { if (s.cancelOrder(order.id)) toast.success("الطلب اتلغى ومفيش أي رسوم"); else toast.error("المحل أكد خلاص. كلم الدعم لو محتاج تلغي"); setCancelOpen(false); }}>أيوه، الغي الطلب</Button>
          <Button variant="secondary" size="lg" block onClick={() => setCancelOpen(false)}>لأ، كمّل الطلب</Button>
        </div>
      </Sheet>

      {!courier && <EditSheet open={editOpen} onOpenChange={setEditOpen} orderId={order.id} />}
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} orderId={order.id} />
      <RateSheet open={rateOpen} onOpenChange={setRateOpen} orderId={order.id} storeName={store?.name ?? "المشوار"} />
      <ChatSheet who={chat} onClose={() => setChat(null)} orderNumber={order.number} riderName={RIDER.name} />
    </main>
  );
}

function EditSheet({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (v: boolean) => void; orderId: string }) {
  const s = useCustomer();
  const order = s.orders.find((o) => o.id === orderId)!;
  const store = storeById(order.storeId)!;
  const [lines, setLines] = useState<CartLine[]>(order.lines);
  useEffect(() => { if (open) setLines(order.lines); }, [open, order.lines]);
  const q = useMemo(() => quote({ lines, store }), [lines, store]);
  const diff = q.total - order.quote.total;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="عدّل طلبك" description="التعديل متاح لحد ما المحل يأكد."
      footer={<Button block size="lg" disabled={lines.length === 0 || q.belowMinimumBy > 0} onClick={() => { if (s.editOrder(orderId, lines)) toast.success("الطلب اتعدل والفاتورة اتحدثت"); else toast.error("المحل بدأ في الطلب خلاص"); onOpenChange(false); }}>
        احفظ التعديل {diff !== 0 && <span className="tabular-nums">({diff > 0 ? "+" : "−"}{egp(Math.abs(diff))})</span>}
      </Button>}>
      <ul className="space-y-3 px-5 pb-4">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3">
            <Photo src={l.img} alt="" className="size-12 rounded-xl" sizes="48px" />
            <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{l.name}</span><span className="text-[13px] tabular-nums text-ink-2">{egp(lineTotal(l))}</span></span>
            <Stepper size="sm" qty={l.qty} onChange={(n) => setLines(n <= 0 ? lines.filter((x) => x.key !== l.key) : lines.map((x) => (x.key === l.key ? { ...x, qty: n } : x)))} label={l.name} />
          </li>
        ))}
      </ul>
      {q.belowMinimumBy > 0 && <p className="px-5 pb-4 text-[13px] text-void">الطلب لازم يفضل فوق {egp(store.minOrder)}</p>}
    </Sheet>
  );
}

const REASONS = ["صنف ناقص", "صنف غلط", "الأكل بايظ أو بارد", "الكمية أقل"];

function ReportSheet({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (v: boolean) => void; orderId: string }) {
  const s = useCustomer();
  const order = s.orders.find((o) => o.id === orderId)!;
  const [keys, setKeys] = useState<string[]>([]);
  const [reason, setReason] = useState(REASONS[0]);
  const [done, setDone] = useState(0);
  const refunded = new Set(order.refunds.map((r) => r.lineKey));
  const amount = order.lines.filter((l) => keys.includes(l.key)).reduce((a, l) => a + lineTotal(l), 0);
  useEffect(() => { if (open) { setKeys([]); setDone(0); } }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={done ? undefined : "إيه المشكلة؟"} description={done ? undefined : "اختار الأصناف اللي فيها مشكلة وفلوسها ترجع محفظتك على طول."}>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-6 pb-10 pt-6 text-center">
            <Stamp tone="stamp" size="lg" animate>رجعت المحفظة</Stamp>
            <p className="mt-6 text-[28px] font-bold tabular-nums text-stamp">{egp(done)}</p>
            <p className="mt-2 max-w-[30ch] text-[14.5px] text-ink-2">الفلوس في محفظتك دلوقتي وتقدر تستخدمها في أي طلب. وبلغنا المحل عشان ميتكررش.</p>
            <Button className="mt-6" variant="secondary" onClick={() => onOpenChange(false)}>تمام</Button>
          </motion.div>
        ) : (
          <motion.div key="form" className="px-5 pb-6">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="السبب">
              {REASONS.map((r) => (
                <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cx("tap h-9 rounded-full px-3.5 text-[13.5px] ring-1 ring-inset", reason === r ? "bg-ink text-white ring-ink" : "ring-rule")}>{r}</button>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {order.lines.map((l) => {
                const was = refunded.has(l.key);
                const on = keys.includes(l.key);
                return (
                  <li key={l.key}>
                    <button disabled={was} role="checkbox" aria-checked={on} onClick={() => setKeys(on ? keys.filter((k) => k !== l.key) : [...keys, l.key])} className={cx("tap flex w-full items-center gap-3 rounded-2xl p-3 text-start ring-1 ring-inset disabled:opacity-50", on ? "bg-void-50 ring-void" : "ring-rule")}>
                      <span className={cx("grid size-5 place-items-center rounded-md border-2", on ? "border-void bg-void text-white" : "border-leader")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                      <span className="flex-1 text-[15px]">{l.qty}× {l.name}</span>
                      <span className="text-[14px] tabular-nums text-ink-2">{was ? "اترد" : egp(lineTotal(l))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button className="tap mt-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-[14px] text-pen" onClick={() => toast("ضفنا الصورة (ديمو)")}><Camera className="size-4.5" /> ضيف صورة (اختياري)</button>
            <Button block size="lg" className="mt-3" variant="danger" disabled={keys.length === 0} onClick={() => setDone(s.refundLines(orderId, keys, reason))}>
              رجّعلي {egp(amount)} للمحفظة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

const TAGS = ["سخن", "مغلف كويس", "الطيار محترم", "في ميعاده", "طعمه حلو"];

function RateSheet({ open, onOpenChange, orderId, storeName }: { open: boolean; onOpenChange: (v: boolean) => void; orderId: string; storeName: string }) {
  const rate = useCustomer((s) => s.rateOrder);
  const [storeStars, setStoreStars] = useState(0);
  const [riderStars, setRiderStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="الطلب عجبك؟" description="تقييمك بيساعد الناس في الفيوم تختار صح."
      footer={<Button block size="lg" disabled={!storeStars} onClick={() => { rate(orderId, { store: storeStars, rider: riderStars || storeStars }); toast.success("شكراً! ضفنالك 10 نقط"); onOpenChange(false); }}>ابعت التقييم</Button>}>
      <div className="space-y-6 px-5 pb-4">
        <Stars label={storeName} value={storeStars} onChange={setStoreStars} />
        <Stars label={`الطيار ${RIDER.name}`} value={riderStars} onChange={setRiderStars} />
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button key={t} aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} className={cx("tap h-9 rounded-full px-3.5 text-[13.5px] ring-1 ring-inset", tags.includes(t) ? "bg-stamp-50 text-stamp ring-stamp" : "ring-rule")}>{t}</button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="text-[15px] font-medium">{label}</p>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} aria-label={`${n} نجوم`} onClick={() => onChange(n)} className="tap">
            <motion.span animate={{ scale: value >= n ? 1.1 : 1 }} className="block"><Star className={cx("size-10", value >= n ? "fill-marker text-[#e0b400]" : "text-rule")} /></motion.span>
          </button>
        ))}
      </div>
    </div>
  );
}

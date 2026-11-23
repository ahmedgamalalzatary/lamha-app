"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Banknote, Bike, CalendarClock, Check, ChevronLeft, CreditCard, MapPin, Plus, ReceiptText, Store as StoreIcon, Ticket, Trash2, Utensils, Wallet, Sparkles } from "lucide-react";
import { useCustomer, currentQuote, type Payment } from "@/lib/store/customer";
import { storeById } from "@/lib/data/stores";
import { lineTotal } from "@/lib/pricing";
import { Photo, Segmented, Stepper, StoreLogo, Switch, TopBar, Empty } from "@/components/ui/bits";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { Button, LinkButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AddressSheet } from "@/components/customer/address-sheet";
import { pickupAllowed } from "@/lib/data/admin";
import dynamic from "next/dynamic";

const PinMap = dynamic(() => import("@/components/customer/pin-map"), { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-pen-50" /> });
import { egp, cx } from "@/lib/format";

const TIPS = [0, 5, 10, 20];
const SLOTS = ["النهارده 2:00 – 2:30", "النهارده 3:00 – 3:30", "النهارده 8:00 – 8:30 م", "بكرة 10:00 – 10:30 ص", "بكرة 2:00 – 2:30"];

export default function CartPage() {
  const router = useRouter();
  const s = useCustomer();
  const store = s.cart.storeId ? storeById(s.cart.storeId) : undefined;
  const q = currentQuote(s);
  const [addrOpen, setAddrOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [confirmLoc, setConfirmLoc] = useState(false);
  const addr = s.addresses.find((a) => a.id === s.addressId) ?? s.addresses[0];

  useEffect(() => {
    if (store && !pickupAllowed(store) && s.mode === "pickup") useCustomer.setState({ mode: "delivery" });
  }, [store, s.mode]);

  const upsell = useMemo(() => {
    if (!store) return [];
    const inCart = new Set(s.cart.lines.map((l) => l.itemId));
    return store.menu.flatMap((c) => c.items).filter((i) => !inCart.has(i.id) && !i.options?.some((g) => g.required)).slice(0, 6);
  }, [store, s.cart.lines]);

  if (!store || !q || s.cart.lines.length === 0) {
    return (
      <main className="min-h-dvh">
        <TopBar title="الفاتورة" />
        <Empty icon={<ReceiptText className="size-8" />} title="فاتورتك لسه فاضية" body="ضيف أكل أو طلبات من أي محل وهتلاقي كل قرش مكتوب هنا قبل ما تأكد." action={<LinkButton href="/app">اتفرج على المحلات</LinkButton>} />
      </main>
    );
  }

  const freeGap = store.freeDeliveryOver !== undefined && s.mode === "delivery" ? store.freeDeliveryOver - q.subtotal : 0;
  const closed = !store.open && !s.scheduledFor;
  const blocked = q.belowMinimumBy > 0 || closed;
  const cardOk = store.payments.includes("card");

  const canPickup = pickupAllowed(store);

  /** Delivery orders confirm the drop-off location first. */
  const ask = () => {
    if (blocked) return;
    if (s.mode === "delivery") setConfirmLoc(true);
    else place();
  };

  const place = () => {
    if (blocked) return;
    setConfirmLoc(false);
    setPlacing(true);
    setTimeout(() => {
      const id = s.placeOrder();
      if (id) router.replace(`/app/orders/${id}`);
      else setPlacing(false);
    }, 1500);
  };

  return (
    <main className="min-h-dvh pb-36">
      <TopBar
        title="الفاتورة"
        subtitle={store.name}
        actions={
          <button onClick={() => { s.clearCart(); toast("الفاتورة اتمسحت"); }} className="tap inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[13.5px] text-void hover:bg-void-50">
            <Trash2 className="size-4" /> امسح
          </button>
        }
      />

      {/* The items */}
      <div className="px-4 pt-2">
        <Receipt top>
          <div className="flex items-center gap-3">
            <StoreLogo store={store} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">{store.name}</p>
              <p className="text-[12.5px] text-ink-3">فاتورة مبدئية • {s.cart.lines.reduce((n, l) => n + l.qty, 0)} صنف</p>
            </div>
            <button onClick={() => router.push(`/app/store/${store.id}`)} className="tap inline-flex h-9 items-center gap-1 rounded-xl bg-pen-50 px-3 text-[13.5px] font-medium text-pen">
              <Plus className="size-4" /> زوّد
            </button>
          </div>
          <Perf />
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {s.cart.lines.map((l) => (
                <motion.li key={l.key} layout exit={{ opacity: 0, height: 0 }} className="flex gap-3">
                  <Photo src={l.img} alt="" className="size-14 shrink-0 rounded-xl" sizes="56px" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline">
                      <span className="text-[15px] font-medium">{l.name}</span>
                      <span className="leader" aria-hidden />
                      <span className="text-[15px] font-semibold tabular-nums">{egp(lineTotal(l))}</span>
                    </div>
                    {(l.choices.length > 0 || l.note) && (
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
                        {l.choices.map((c) => c.name + (c.price ? ` (+${c.price})` : "")).join("، ")}
                        {l.note && <span className="block text-ink-2">«{l.note}»</span>}
                      </p>
                    )}
                    <div className="mt-2"><Stepper size="sm" qty={l.qty} onChange={(n) => s.setQty(l.key, n)} label={l.name} /></div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {(q.belowMinimumBy > 0 || freeGap > 0) && (
            <div className="mt-4 rounded-2xl bg-paper p-3">
              {q.belowMinimumBy > 0 ? (
                <Progress label={`ناقص ${egp(q.belowMinimumBy)} وتوصل لأقل طلب (${egp(store.minOrder)})`} value={q.subtotal / store.minOrder} tone="void" />
              ) : (
                <Progress label={`ضيف ${egp(freeGap)} والتوصيل يبقى مجاني`} value={q.subtotal / store.freeDeliveryOver!} tone="stamp" />
              )}
            </div>
          )}
          {freeGap <= 0 && store.freeDeliveryOver !== undefined && s.mode === "delivery" && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-stamp"><Check className="size-4" /> التوصيل مجاني لأن طلبك فوق {egp(store.freeDeliveryOver)}</p>
          )}
        </Receipt>
      </div>

      {upsell.length > 0 && (
        <section className="mt-6">
          <h2 className="px-4 text-[16px] font-semibold">تحب تزود؟</h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {upsell.map((it) => (
              <button key={it.id} onClick={() => { s.addLine(store.id, { itemId: it.id, name: it.name, img: it.img, basePrice: it.price, choices: [], qty: 1 }); toast.success(`${it.name} اتضاف`, { duration: 1200 }); }} className="tap flex w-[210px] shrink-0 items-center gap-2.5 rounded-2xl bg-sheet p-2 text-start shadow-sheet">
                <Photo src={it.img} alt="" className="size-12 rounded-xl" sizes="48px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{it.name}</span>
                  <span className="block text-[13px] tabular-nums text-ink-2">{egp(it.price)}</span>
                </span>
                <span className="grid size-8 place-items-center rounded-full bg-pen-50 text-pen"><Plus className="size-4" /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Delivery */}
      <Block title="التوصيل">
        {canPickup ? (
          <Segmented value={s.mode} onChange={(v) => useCustomer.setState({ mode: v })} options={[{ value: "delivery", label: "توصيل" }, { value: "pickup", label: "استلام من المحل" }]} />
        ) : (
          <p className="rounded-xl bg-paper px-3 py-2 text-[12.5px] text-ink-3">المحل ده بيوصل بس، الاستلام من المحل مش متاح</p>
        )}
        <button onClick={() => (s.mode === "delivery" ? setAddrOpen(true) : undefined)} className="tap mt-3 flex w-full items-center gap-3 rounded-2xl p-1 text-start">
          <span className="grid size-10 place-items-center rounded-xl bg-pen-50 text-pen">{s.mode === "delivery" ? <MapPin className="size-5" /> : <StoreIcon className="size-5" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">{s.mode === "delivery" ? addr.label : store.name}</span>
            <span className="block truncate text-[13px] text-ink-2">{s.mode === "delivery" ? `${addr.area}، ${addr.street}، ${addr.details}` : `${store.area}، الفيوم • هيكون جاهز في ${store.etaMin} دقيقة`}</span>
          </span>
          {s.mode === "delivery" && <ChevronLeft className="size-5 text-ink-3" />}
        </button>
        <button onClick={() => setTimeOpen(true)} className="tap mt-2 flex w-full items-center gap-3 rounded-2xl p-1 text-start">
          <span className="grid size-10 place-items-center rounded-xl bg-pen-50 text-pen"><CalendarClock className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">{s.scheduledFor ? "مجدول" : "دلوقتي"}</span>
            <span className={cx("block text-[13px]", closed ? "text-void" : "text-ink-2")}>{s.scheduledFor ?? (store.open ? `${s.mode === "pickup" ? store.etaMin : `${store.etaMin}–${store.etaMax}`} دقيقة` : "المحل مقفول، جدول طلبك")}</span>
          </span>
          <ChevronLeft className="size-5 text-ink-3" />
        </button>
        <label className="mt-3 block">
          <span className="sr-only">ملاحظة للمحل والطيار</span>
          <textarea value={s.cart.note} onChange={(e) => s.setCartNote(e.target.value.slice(0, 140))} rows={2} placeholder="ملاحظة للمحل أو الطيار (اختياري)" className="w-full resize-none rounded-2xl bg-paper p-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
        </label>
        <div className="mt-2 flex items-center gap-3 py-1">
          <Utensils className="size-5 text-ink-3" />
          <span className="flex-1 text-[14.5px]">ابعتوا معالق وفوط</span>
          <Switch checked={s.cart.cutlery} onChange={s.setCutlery} label="ابعتوا معالق وفوط" />
        </div>
      </Block>

      {/* Payment */}
      <Block title="هتدفع إزاي؟">
        <div className="grid gap-2" role="radiogroup" aria-label="طريقة الدفع">
          <PayOption on={s.payment === "cash"} onClick={() => useCustomer.setState({ payment: "cash" })} icon={<Banknote className="size-5" />} title="كاش عند الاستلام" sub="الطيار معاه فكة" />
          <PayOption on={s.payment === "card"} disabled={!cardOk} onClick={() => useCustomer.setState({ payment: "card" as Payment })} icon={<CreditCard className="size-5" />} title="كارت •••• 4242" sub={cardOk ? "فيزا محفوظة" : "المحل ده مش بيقبل كارت"} />
        </div>
        <div className="mt-3 space-y-1 rounded-2xl bg-paper p-3">
          <div className="flex items-center gap-3 py-1">
            <Wallet className="size-5 text-pen" />
            <span className="flex-1 text-[14.5px]">استخدم المحفظة <span className="text-ink-3 tabular-nums">({egp(s.wallet)})</span></span>
            <Switch checked={s.useWallet} onChange={(v) => useCustomer.setState({ useWallet: v })} label="استخدم رصيد المحفظة" />
          </div>
          <div className="flex items-center gap-3 py-1">
            <Sparkles className="size-5 text-[#c99a00]" />
            <span className="flex-1 text-[14.5px]">استبدل نقطك <span className="text-ink-3 tabular-nums">({s.points} نقطة = {egp(Math.floor(s.points / 100) * 10)})</span></span>
            <Switch checked={s.usePoints} onChange={(v) => useCustomer.setState({ usePoints: v })} label="استبدل النقط" />
          </div>
        </div>
        <div className="mt-3">
          {s.promoCode ? (
            <div className="flex items-center gap-3 rounded-2xl bg-stamp-50 p-3">
              <Ticket className="size-5 text-stamp" />
              <span className="flex-1 text-[14.5px]"><b dir="ltr">{s.promoCode}</b> {q.promoError ? "" : "اتطبق"}</span>
              <button onClick={s.removePromo} className="text-[13.5px] text-void">شيله</button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (s.applyPromo(code) === "unknown") toast.error("الكود ده مش موجود. جرب LAMHA20 أو FAYOUM"); else setCode(""); }} className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="عندك كود خصم؟" dir="auto" className="h-12 min-w-0 flex-1 rounded-2xl bg-paper px-4 text-[15px] uppercase outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
              <Button type="submit" variant="secondary" disabled={!code.trim()}>طبّق</Button>
            </form>
          )}
          {q.promoError && <p className="mt-2 text-[13px] text-void">{q.promoError}</p>}
        </div>
      </Block>

      {s.mode === "delivery" && (
        <Block title="إكرامية للطيار" hint="بتوصله كاملة، ومش إجبارية">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="الإكرامية">
            {TIPS.map((t) => (
              <button key={t} role="radio" aria-checked={s.tip === t} onClick={() => useCustomer.setState({ tip: t })} className={cx("tap h-11 rounded-xl text-[14.5px] font-medium ring-1 ring-inset tabular-nums", s.tip === t ? "bg-pen text-white ring-pen" : "bg-sheet ring-rule")}>
                {t === 0 ? "لأ شكراً" : `${t} ج.م`}
              </button>
            ))}
          </div>
        </Block>
      )}

      {/* The bill */}
      <div className="mt-6 px-4">
        <Receipt top>
          <p className="text-[16px] font-semibold">الحساب</p>
          <div className="mt-2 text-[14.5px]">
            {q.lines.map((l) => (
              <Row key={l.key} label={l.label} amount={l.amount} struck={l.struck} note={l.key === "delivery" && s.mode === "pickup" ? "هتستلم بنفسك من المحل" : l.note} tone={l.amount < 0 || (l.key === "delivery" && l.struck) ? "stamp" : "ink"} />
            ))}
          </div>
          <Perf />
          <div className="flex items-baseline text-[19px] font-bold">
            <span className="marked">الإجمالي</span>
            <span className="leader" />
            <span className="tabular-nums">{egp(q.total)}</span>
          </div>
          {q.walletApplied > 0 && (
            <div className="mt-2 text-[14.5px]">
              <Row label="من المحفظة" amount={-q.walletApplied} tone="stamp" />
              <Row label={s.payment === "card" ? "على الكارت" : "هتدفع للطيار"} amount={q.dueOnDelivery} bold />
            </div>
          )}
          <p className="mt-3 flex gap-2 rounded-xl bg-pen-50 p-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <Check className="mt-0.5 size-4 shrink-0 text-pen" />
            ده المبلغ النهائي. مفيش أي رسوم هتظهر بعد التأكيد، ولو المحل غيّر حاجة هنسألك الأول.
          </p>
        </Receipt>
      </div>

      {/* Sticky confirm */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-rule bg-sheet/95 px-4 pt-3 backdrop-blur">
        {blocked && <p className="mb-2 text-center text-[13px] text-void">{closed ? "المحل مقفول. جدول الطلب عشان تكمّل" : `ناقص ${egp(q.belowMinimumBy)} للحد الأدنى`}</p>}
        <Button block size="lg" disabled={blocked} loading={placing} onClick={ask}>
          <span>أكّد الطلب</span>
          <span className="tabular-nums">• {egp(q.total)}</span>
        </Button>
        <p className="mt-2 text-center text-[12px] text-ink-3">تقدر تلغي ببلاش لحد ما المحل يأكد</p>
      </div>

      <AnimatePresence>{placing && <PlacingOverlay storeName={store.name} total={q.total} />}</AnimatePresence>

      <AddressSheet open={addrOpen} onOpenChange={setAddrOpen} />
      <Sheet open={confirmLoc} onOpenChange={setConfirmLoc} title="أكّد مكان التوصيل" description="الطيار هيوصل للنقطة دي بالظبط. اتأكد إنها صح قبل ما نبعت الطلب.">
        <div className="px-5 pb-6">
          <div className="overflow-hidden rounded-2xl ring-1 ring-rule">
            {confirmLoc && <PinMap center={addr.coords} onMove={() => {}} height={200} />}
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-paper p-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-pen" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{addr.label}</span>
              <span className="block text-[13px] text-ink-2">{addr.area}، {addr.street}، {addr.details}</span>
              {addr.landmark && <span className="block text-[12.5px] text-ink-3">علامة مميزة: {addr.landmark}</span>}
            </span>
          </div>
          <div className="mt-4 grid gap-2.5">
            <Button block size="lg" onClick={place}><Check className="size-5" /> أيوه، وصّلوا هنا</Button>
            <Button block size="lg" variant="secondary" onClick={() => { setConfirmLoc(false); setAddrOpen(true); }}>غيّر العنوان</Button>
          </div>
        </div>
      </Sheet>
      <Sheet open={timeOpen} onOpenChange={setTimeOpen} title="عايزه امتى؟">
        <div className="grid gap-2 px-5 pb-8" role="radiogroup">
          <TimeOpt on={!s.scheduledFor} disabled={!store.open} onClick={() => { useCustomer.setState({ scheduledFor: null }); setTimeOpen(false); }} title="دلوقتي" sub={store.open ? `${store.etaMin}–${store.etaMax} دقيقة` : "المحل مقفول دلوقتي"} />
          {SLOTS.map((sl) => <TimeOpt key={sl} on={s.scheduledFor === sl} onClick={() => { useCustomer.setState({ scheduledFor: sl }); setTimeOpen(false); }} title={sl} sub="هنفكرك قبلها بنص ساعة" />)}
        </div>
      </Sheet>
    </main>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Progress({ label, value, tone }: { label: string; value: number; tone: "stamp" | "void" }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[13.5px] font-medium">{tone === "stamp" ? <Bike className="size-4 text-stamp" /> : null}{label}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-rule">
        <motion.div className={cx("h-full rounded-full", tone === "stamp" ? "bg-stamp" : "bg-void")} initial={false} animate={{ width: `${Math.min(100, value * 100)}%` }} transition={{ type: "spring", bounce: 0, duration: 0.6 }} />
      </div>
    </div>
  );
}

function PayOption({ on, onClick, icon, title, sub, disabled }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; disabled?: boolean }) {
  return (
    <button role="radio" aria-checked={on} disabled={disabled} onClick={onClick} className={cx("tap flex items-center gap-3 rounded-2xl p-3 text-start ring-1 ring-inset disabled:opacity-45", on ? "bg-pen-50 ring-pen" : "ring-rule")}>
      <span className={cx("grid size-10 place-items-center rounded-xl", on ? "bg-pen text-white" : "bg-paper text-ink-2")}>{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="block text-[12.5px] text-ink-3">{sub}</span>
      </span>
      <span className={cx("grid size-5 place-items-center rounded-full border-2", on ? "border-pen" : "border-leader")}>{on && <span className="size-2.5 rounded-full bg-pen" />}</span>
    </button>
  );
}

function TimeOpt({ on, onClick, title, sub, disabled }: { on: boolean; onClick: () => void; title: string; sub: string; disabled?: boolean }) {
  return (
    <button role="radio" aria-checked={on} disabled={disabled} onClick={onClick} className={cx("tap flex items-center gap-3 rounded-2xl p-3.5 text-start ring-1 ring-inset disabled:opacity-45", on ? "bg-pen-50 ring-pen" : "ring-rule")}>
      <span className="flex-1"><span className="block text-[15px] font-medium">{title}</span><span className="block text-[12.5px] text-ink-3">{sub}</span></span>
      {on && <Check className="size-5 text-pen" />}
    </button>
  );
}

function PlacingOverlay({ storeName, total }: { storeName: string; total: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] mx-auto grid max-w-[440px] place-items-center bg-pen/95 px-8">
      <motion.div initial={{ y: 40, rotate: -2 }} animate={{ y: 0, rotate: 0 }} transition={{ type: "spring", bounce: 0.3 }} className="relative w-full">
        <Receipt>
          <p className="text-center text-[13px] text-ink-3">فاتورة</p>
          <p className="text-center text-[18px] font-semibold">{storeName}</p>
          <Perf />
          <div className="flex items-baseline text-[20px] font-bold"><span>الإجمالي</span><span className="leader" /><span className="tabular-nums">{egp(total)}</span></div>
          <div className="h-16" />
        </Receipt>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="absolute inset-x-0 bottom-6 grid place-items-center">
          <Stamp tone="stamp" size="lg" animate>اتبعت للمحل</Stamp>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

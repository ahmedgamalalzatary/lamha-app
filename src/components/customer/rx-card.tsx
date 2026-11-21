"use client";
import { useRef, useState } from "react";
import { Camera, Check, FileImage, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { useCustomer } from "@/lib/store/customer";
import { findItem } from "@/lib/data/stores";
import { egp, cx } from "@/lib/format";

const RX_ITEMS = [
  { id: "ph1", qty: 2, note: "قرص كل 8 ساعات بعد الأكل" },
  { id: "ph6", qty: 1, note: "قرص فوار يومياً" },
  { id: "ph3", qty: 1, note: "5 مل 3 مرات يومياً" },
];

export function RxCard({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<"pick" | "review" | "priced">("pick");
  const [picked, setPicked] = useState<string[]>(RX_ITEMS.map((r) => r.id));
  const input = useRef<HTMLInputElement>(null);
  const addLine = useCustomer((s) => s.addLine);
  const clearCart = useCustomer((s) => s.clearCart);
  const cartStore = useCustomer((s) => s.cart.storeId);

  const items = RX_ITEMS.map((r) => ({ ...r, item: findItem(r.id)!.item }));
  const total = items.filter((i) => picked.includes(i.id)).reduce((s, i) => s + i.item.price * i.qty, 0);

  const onFile = (f?: File) => {
    if (!f) return;
    setPhoto(URL.createObjectURL(f));
  };

  const send = () => {
    setPhase("review");
    setTimeout(() => setPhase("priced"), 3200);
  };

  const addAll = () => {
    if (cartStore && cartStore !== storeId) clearCart();
    items.filter((i) => picked.includes(i.id)).forEach((i) => addLine(storeId, { itemId: i.item.id, name: i.item.name, img: i.item.img, basePrice: i.item.price, choices: [], qty: i.qty, note: i.note }));
    toast.success("أدوية الروشتة اتضافت للفاتورة");
    setOpen(false);
    setTimeout(() => { setPhase("pick"); setPhoto(null); }, 400);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="tap mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-[18px] bg-stamp p-4 text-start text-white">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Camera className="size-6" /></span>
        <span className="flex-1">
          <span className="block text-[16px] font-semibold">عندك روشتة؟ صوّرها</span>
          <span className="block text-[13px] text-white/85">الصيدلي يراجعها ويسعّرها في دقايق، وإنت توافق قبل أي حاجة</span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="ارفع الروشتة" description="صورة واضحة للروشتة كلها. محدش بيشوفها غير الصيدلي.">
        <div className="px-5 pb-6">
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {phase === "pick" && (
            <>
              <button onClick={() => input.current?.click()} className={cx("tap grid w-full place-items-center overflow-hidden rounded-[18px] border-2 border-dashed", photo ? "border-stamp" : "border-leader bg-paper", "h-56")}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="صورة الروشتة" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-ink-2">
                    <FileImage className="size-9 text-pen" />
                    <span className="text-[15px] font-medium">صوّر أو اختار من المعرض</span>
                  </span>
                )}
              </button>
              <div className="mt-4 grid gap-2.5">
                <Button block size="lg" onClick={send} disabled={!photo}>ابعتها للصيدلي</Button>
                {!photo && (
                  <Button block variant="ghost" onClick={() => setPhoto("/img/meds1.jpg")}>جرّب بروشتة تجريبية</Button>
                )}
              </div>
            </>
          )}
          {phase === "review" && (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="relative grid size-16 place-items-center rounded-full bg-stamp-50 text-stamp">
                <Stethoscope className="size-8" />
                <Loader2 className="absolute -inset-1 size-[72px] animate-spin text-stamp/40" />
              </span>
              <p className="mt-5 text-[17px] font-semibold">د. منى بتراجع الروشتة</p>
              <p className="mt-1.5 max-w-[28ch] text-[14px] text-ink-2">هتسعّر الأدوية المتوفرة وتقولك البديل لو في حاجة ناقصة</p>
            </div>
          )}
          {phase === "priced" && (
            <div>
              <Receipt className="text-[14.5px]">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">تسعير د. منى</p>
                  <Stamp tone="stamp" size="sm" animate>اتراجعت</Stamp>
                </div>
                <Perf className="my-3" />
                {items.map((i) => {
                  const on = picked.includes(i.id);
                  return (
                    <button key={i.id} onClick={() => setPicked(on ? picked.filter((p) => p !== i.id) : [...picked, i.id])} role="checkbox" aria-checked={on} className="flex w-full items-start gap-2.5 py-1.5 text-start">
                      <span className={cx("mt-1 grid size-5 shrink-0 place-items-center rounded-md border-2", on ? "border-stamp bg-stamp text-white" : "border-leader")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                      <span className="flex-1">
                        <Row label={`${i.qty}× ${i.item.name}`} amount={i.item.price * i.qty} tone={on ? "ink" : "muted"} note={i.note} className="!py-0" />
                      </span>
                    </button>
                  );
                })}
                <Perf className="my-3" />
                <Row label={<span className="marked">المجموع</span>} amount={total} bold />
              </Receipt>
              <Button block size="lg" className="mt-4" disabled={picked.length === 0} onClick={addAll}>ضيف {picked.length} أدوية للفاتورة • {egp(total)}</Button>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

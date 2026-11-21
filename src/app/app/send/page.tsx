"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Box, FileText, KeyRound, Package, Soup, MoreHorizontal } from "lucide-react";
import { TopBar } from "@/components/ui/bits";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Button } from "@/components/ui/button";
import { useCustomer } from "@/lib/store/customer";
import { AREAS } from "@/lib/data/stores";
import { AREA_NAMES } from "@/lib/data/seed";
import { egp, cx } from "@/lib/format";

const WHAT = [
  { id: "مستندات", icon: FileText },
  { id: "أكل بيتي", icon: Soup },
  { id: "مفاتيح", icon: KeyRound },
  { id: "طرد", icon: Package },
  { id: "حاجة تانية", icon: MoreHorizontal },
];
const SIZES = [
  { id: "صغير", sub: "يدخل شنطة الطيار", extra: 0 },
  { id: "متوسط", sub: "لحد 5 كيلو", extra: 10 },
  { id: "كبير", sub: "لحد 15 كيلو", extra: 25 },
];

function km(a: string, b: string) {
  const p = AREAS[a], q = AREAS[b];
  if (!p || !q) return 1;
  return Math.max(0.8, +(Math.hypot((p[0] - q[0]) * 111, (p[1] - q[1]) * 97) * 1.3).toFixed(1));
}

export default function Send() {
  const router = useRouter();
  const place = useCustomer((s) => s.placeCourier);
  const home = useCustomer((s) => s.addresses[0]);
  const [from, setFrom] = useState("المسلة");
  const [fromDetails, setFromDetails] = useState("");
  const [to, setTo] = useState(home?.area ?? "الحادقة");
  const [toDetails, setToDetails] = useState(home ? `${home.street}، ${home.details}` : "");
  const [what, setWhat] = useState("مستندات");
  const [size, setSize] = useState("صغير");
  const [busy, setBusy] = useState(false);

  const d = useMemo(() => km(from, to), [from, to]);
  const base = 20;
  const perKm = Math.round(d * 7);
  const extra = SIZES.find((s) => s.id === size)!.extra;
  const total = base + perKm + extra;
  const ok = fromDetails.trim().length > 2 && toDetails.trim().length > 2;

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      const id = place({ from: `${from}، ${fromDetails}`, to: `${to}، ${toDetails}`, what, size }, total);
      router.replace(`/app/orders/${id}`);
    }, 900);
  };

  return (
    <main className="min-h-dvh pb-32">
      <TopBar title="ابعت أي حاجة" subtitle="طيار يستلم من مكان ويسلم في مكان" />
      <div className="px-4">
        <div className="rounded-[18px] bg-sheet p-4 shadow-sheet">
          <Place label="هيستلم من" area={from} setArea={setFrom} details={fromDetails} setDetails={setFromDetails} placeholder="الشارع والعمارة واسم الشخص" dot="bg-pen" />
          <div className="my-1 flex items-center gap-2 ps-1 text-ink-3"><ArrowDown className="size-4" /><span className="h-px flex-1 border-t-2 border-dotted border-leader" /><span className="text-[12.5px] tabular-nums">{d} كم</span></div>
          <Place label="هيسلم في" area={to} setArea={setTo} details={toDetails} setDetails={setToDetails} placeholder="الشارع والعمارة والدور" dot="bg-stamp" />
        </div>

        <h2 className="mt-6 text-[16px] font-semibold">بتبعت إيه؟</h2>
        <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup">
          {WHAT.map((w) => (
            <button key={w.id} role="radio" aria-checked={what === w.id} onClick={() => setWhat(w.id)} className={cx("tap flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[12px] ring-1 ring-inset", what === w.id ? "bg-pen-50 text-pen ring-pen" : "bg-sheet text-ink-2 ring-rule")}>
              <w.icon className="size-5" /> {w.id}
            </button>
          ))}
        </div>

        <h2 className="mt-6 text-[16px] font-semibold">الحجم</h2>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup">
          {SIZES.map((s) => (
            <button key={s.id} role="radio" aria-checked={size === s.id} onClick={() => setSize(s.id)} className={cx("tap rounded-2xl p-3 text-start ring-1 ring-inset", size === s.id ? "bg-pen-50 ring-pen" : "bg-sheet ring-rule")}>
              <Box className={cx("size-5", size === s.id ? "text-pen" : "text-ink-3")} />
              <span className="mt-1.5 block text-[14.5px] font-medium">{s.id}</span>
              <span className="block text-[11.5px] leading-snug text-ink-3">{s.sub}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Receipt>
            <p className="text-[15px] font-semibold">سعر المشوار</p>
            <div className="mt-1 text-[14.5px]">
              <Row label="فتح المشوار" amount={base} />
              <Row label={`المسافة (${d} كم × 7)`} amount={perKm} />
              <Row label={`حجم ${size}`} amount={extra} />
            </div>
            <Perf />
            <div className="flex items-baseline text-[18px] font-bold"><span className="marked">الإجمالي</span><span className="leader" /><span className="tabular-nums">{egp(total)}</span></div>
            <p className="mt-2 text-[12.5px] text-ink-3">السعر ثابت ومش هيزيد لو الطريق زحمة.</p>
          </Receipt>
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-rule bg-sheet/95 px-4 pt-3 backdrop-blur">
        {!ok && <p className="mb-2 text-center text-[13px] text-ink-3">اكتب تفاصيل العنوانين عشان الطيار يلاقيهم</p>}
        <Button block size="lg" disabled={!ok} loading={busy} onClick={submit}>اطلب طيار • {egp(total)}</Button>
      </div>
    </main>
  );
}

function Place({ label, area, setArea, details, setDetails, placeholder, dot }: { label: string; area: string; setArea: (v: string) => void; details: string; setDetails: (v: string) => void; placeholder: string; dot: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2"><span className={cx("size-2.5 rounded-full", dot)} /> {label}</p>
      <div className="mt-2 flex gap-2">
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label={`منطقة ${label}`} className="h-12 rounded-xl bg-paper px-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen">
          {AREA_NAMES.map((a) => <option key={a}>{a}</option>)}
        </select>
        <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder={placeholder} aria-label={`تفاصيل ${label}`} className="h-12 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
      </div>
    </div>
  );
}

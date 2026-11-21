"use client";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Home, MapPin, Plus, Trash2 } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import type { Address } from "@/lib/data/seed";
import { AREAS } from "@/lib/data/stores";
import { AREA_NAMES } from "@/lib/data/seed";
import { TopBar, Empty } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/format";

const PinMap = dynamic(() => import("@/components/customer/pin-map"), { ssr: false, loading: () => <div className="h-[280px] animate-pulse bg-pen-50" /> });
const ICON = { home: Home, work: Briefcase, pin: MapPin };

function nearestArea(c: [number, number]) {
  return AREA_NAMES.reduce((best, a) => (Math.hypot(AREAS[a][0] - c[0], AREAS[a][1] - c[1]) < Math.hypot(AREAS[best][0] - c[0], AREAS[best][1] - c[1]) ? a : best), AREA_NAMES[0]);
}

function AddressesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { addresses, addressId, saveAddress, removeAddress } = useCustomer();
  const [editing, setEditing] = useState<Address | null>(null);

  useEffect(() => {
    if (params.get("new")) setEditing({ id: `a-${Date.now()}`, label: "", icon: "pin", area: "الحادقة", street: "", details: "", coords: [29.3105, 30.8418] });
  }, [params]);

  return (
    <main className="min-h-dvh pb-28">
      <TopBar title="عناويني" />
      {addresses.length === 0 ? (
        <Empty icon={<MapPin className="size-8" />} title="مفيش عناوين لسه" body="ضيف عنوانك مرة واحدة وكل طلب بعد كده بضغطة." />
      ) : (
        <ul className="space-y-3 px-4">
          {addresses.map((a) => {
            const Icon = ICON[a.icon];
            return (
              <li key={a.id} className={cx("flex items-center gap-3 rounded-[18px] bg-sheet p-3.5 shadow-sheet", a.id === addressId && "ring-2 ring-pen")}>
                <span className="grid size-11 place-items-center rounded-xl bg-pen-50 text-pen"><Icon className="size-5" /></span>
                <button onClick={() => setEditing(a)} className="min-w-0 flex-1 text-start">
                  <span className="flex items-center gap-2 text-[15.5px] font-semibold">{a.label}{a.id === addressId && <span className="rounded bg-pen-50 px-1.5 text-[11.5px] font-medium text-pen">الحالي</span>}</span>
                  <span className="block truncate text-[13px] text-ink-2">{a.area}، {a.street}، {a.details}</span>
                  {a.landmark && <span className="block truncate text-[12.5px] text-ink-3">علامة مميزة: {a.landmark}</span>}
                </button>
                <button aria-label={`امسح ${a.label}`} onClick={() => { removeAddress(a.id); toast("العنوان اتمسح"); }} className="tap grid size-10 place-items-center rounded-full text-void hover:bg-void-50"><Trash2 className="size-4.5" /></button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[440px] bg-paper/95 px-4 pt-3">
        <Button block size="lg" onClick={() => setEditing({ id: `a-${Date.now()}`, label: "", icon: "pin", area: "الحادقة", street: "", details: "", coords: [29.3105, 30.8418] })}><Plus className="size-5" /> ضيف عنوان</Button>
      </div>
      {editing && <AddressEditor initial={editing} onClose={() => { setEditing(null); if (params.get("new")) router.back(); }} onSave={(a) => { saveAddress(a); toast.success("العنوان اتحفظ"); setEditing(null); if (params.get("new")) router.back(); }} />}
    </main>
  );
}

function AddressEditor({ initial, onClose, onSave }: { initial: Address; onClose: () => void; onSave: (a: Address) => void }) {
  const [a, setA] = useState(initial);
  const ok = a.street.trim() && a.details.trim();
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} full title={initial.label ? `تعديل ${initial.label}` : "عنوان جديد"} footer={<Button block size="lg" disabled={!ok} onClick={() => onSave({ ...a, label: a.label.trim() || (a.icon === "home" ? "البيت" : a.icon === "work" ? "الشغل" : a.area) })}>احفظ العنوان</Button>}>
      <PinMap center={a.coords} onMove={(c) => setA((x) => ({ ...x, coords: c, area: nearestArea(c) }))} />
      <div className="space-y-3 px-5 py-4">
        <p className="flex items-center gap-2 rounded-xl bg-pen-50 p-3 text-[14px]"><MapPin className="size-4.5 text-pen" /> المنطقة: <b>{a.area}</b> <span className="text-ink-3">(حرّك الخريطة)</span></p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="نوع العنوان">
          {([["home", "البيت"], ["work", "الشغل"], ["pin", "تاني"]] as const).map(([k, l]) => {
            const Icon = ICON[k];
            return <button key={k} role="radio" aria-checked={a.icon === k} onClick={() => setA({ ...a, icon: k })} className={cx("tap flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] ring-1 ring-inset", a.icon === k ? "bg-pen text-white ring-pen" : "ring-rule")}><Icon className="size-4" /> {l}</button>;
          })}
        </div>
        <Field label="اسم العنوان (اختياري)" value={a.label} onChange={(v) => setA({ ...a, label: v })} placeholder="مثلاً: بيت ماما" />
        <Field label="الشارع" value={a.street} onChange={(v) => setA({ ...a, street: v })} placeholder="اسم الشارع" />
        <Field label="العمارة والدور والشقة" value={a.details} onChange={(v) => setA({ ...a, details: v })} placeholder="عمارة 5، الدور 2، شقة 4" />
        <Field label="علامة مميزة (اختياري)" value={a.landmark ?? ""} onChange={(v) => setA({ ...a, landmark: v })} placeholder="جنب الصيدلية" />
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">المنطقة</span>
          <select value={a.area} onChange={(e) => setA({ ...a, area: e.target.value, coords: AREAS[e.target.value] })} className="mt-1 h-12 w-full rounded-xl bg-paper px-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen">
            {AREA_NAMES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>
    </Sheet>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 h-12 w-full rounded-xl bg-paper px-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
    </label>
  );
}

export default function Addresses() {
  return <Suspense><AddressesInner /></Suspense>;
}

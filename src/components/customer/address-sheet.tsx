"use client";
import Link from "next/link";
import { Briefcase, Check, Home, MapPin, Plus, Store as StoreIcon } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { useCustomer } from "@/lib/store/customer";
import { cx } from "@/lib/format";

const ICON = { home: Home, work: Briefcase, pin: MapPin };

export function AddressSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addresses, addressId, mode } = useCustomer();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="نوصلك فين؟" footer={<Button block onClick={() => onOpenChange(false)}>تمام</Button>}>
      <div className="px-5 pb-4">
        <Segmented
          value={mode}
          onChange={(v) => useCustomer.setState({ mode: v })}
          options={[
            { value: "delivery", label: "توصيل للبيت" },
            { value: "pickup", label: "هستلم بنفسي" },
          ]}
        />
        {mode === "pickup" ? (
          <div className="mt-4 flex gap-3 rounded-2xl bg-pen-50 p-4 text-[14px] leading-relaxed text-ink-2">
            <StoreIcon className="mt-0.5 size-5 shrink-0 text-pen" />
            هتشوف عنوان المحل وميعاد جهوز الطلب في الفاتورة، ومفيش رسوم توصيل.
          </div>
        ) : (
          <ul className="mt-4 space-y-2" role="radiogroup" aria-label="العناوين">
            {addresses.map((a) => {
              const Icon = ICON[a.icon];
              const on = a.id === addressId;
              return (
                <li key={a.id}>
                  <button role="radio" aria-checked={on} onClick={() => useCustomer.setState({ addressId: a.id })} className={cx("tap flex w-full items-center gap-3 rounded-2xl p-3 text-start ring-1 ring-inset", on ? "bg-pen-50 ring-pen" : "bg-sheet ring-rule")}>
                    <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-pen text-white" : "bg-paper text-ink-2")}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{a.label}</span>
                      <span className="block truncate text-[13px] text-ink-2">{a.area}، {a.street}، {a.details}</span>
                    </span>
                    {on && <Check className="size-5 text-pen" />}
                  </button>
                </li>
              );
            })}
            <li>
              <Link href="/app/account/addresses?new=1" className="tap flex items-center gap-3 rounded-2xl p-3 text-pen hover:bg-pen-50">
                <span className="grid size-10 place-items-center rounded-xl bg-pen-50"><Plus className="size-5" /></span>
                <span className="text-[15px] font-medium">ضيف عنوان جديد من الخريطة</span>
              </Link>
            </li>
          </ul>
        )}
      </div>
    </Sheet>
  );
}

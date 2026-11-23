"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, ReceiptText, Search, ShoppingBag, Zap } from "lucide-react";
import { TopBar } from "@/components/ui/bits";
import { StoresList } from "@/components/customer/stores-list";
import { RxCard } from "@/components/customer/rx-card";
import { useCustomer } from "@/lib/store/customer";

const MAIN_PHARMACY = "shifa-pharmacy";

export default function Pharmacy() {
  const [mode, setMode] = useState<null | "rx" | "photo">(null);
  const { addresses, addressId } = useCustomer();
  const addr = addresses.find((a) => a.id === addressId) ?? addresses[0];

  return (
    <main className="pb-6">
      <TopBar
        title={<span className="text-[13px] font-normal text-ink-3">التوصيل إلى</span>}
        subtitle={<span className="text-[15.5px] font-bold text-ink">{addr?.label}</span>}
        actions={<Link href="/app/cart" aria-label="السلة" className="tap grid size-10 place-items-center rounded-xl bg-pen-50 text-ink"><ShoppingBag className="size-5" /></Link>}
      />
      <Link href="/app/search?q=صيدلية" className="tap mx-4 mt-1 flex h-12 items-center gap-2.5 rounded-2xl bg-sheet px-4 text-ink-3 ring-1 ring-rule">
        <Search className="size-5" />
        <span className="text-[15px]">ابحث عن صيدليات</span>
      </Link>

      <h2 className="mt-6 px-4 text-[19px] font-bold">سهلنا الطلب عليك</h2>
      <section className="mx-4 mt-3 overflow-hidden rounded-[20px] bg-sheet ring-1 ring-rule">
        <div className="flex items-center justify-between bg-pen/85 px-4 py-3 text-white">
          <span className="flex items-center gap-1.5 text-[15.5px] font-semibold"><Zap className="size-4.5 fill-white" /> توصيل فوري</span>
          <span className="rounded-full bg-sheet px-3 py-1 text-[13px] font-semibold text-pen tabular-nums">30 - 60 دقيقة</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button onClick={() => setMode("rx")} className="tap flex flex-col items-center gap-2 rounded-2xl bg-paper py-5 ring-1 ring-rule">
            <ReceiptText className="size-8 text-pen" strokeWidth={1.6} />
            <span className="text-[14.5px] text-ink-2">روشتة طبية</span>
          </button>
          <button onClick={() => setMode("photo")} className="tap flex flex-col items-center gap-2 rounded-2xl bg-paper py-5 ring-1 ring-rule">
            <Camera className="size-8 text-pen" strokeWidth={1.6} />
            <span className="text-[14.5px] text-ink-2">صورة المنتج</span>
          </button>
        </div>
      </section>

      <div className="mt-7 flex items-baseline gap-2 px-4"><h2 className="text-[19px] font-bold">المتاجر</h2></div>
      <div className="mt-2"><StoresList vertical="pharmacy" noun="صيدلية" /></div>

      {/* Same upload flow for both entry points; the pharmacist prices it either way */}
      <RxCard storeId={MAIN_PHARMACY} open={mode !== null} onOpenChange={(v) => !v && setMode(null)} kind={mode ?? "rx"} hideTrigger />
    </main>
  );
}

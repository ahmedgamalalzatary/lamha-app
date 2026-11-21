"use client";
import Link from "next/link";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { PROMOS } from "@/lib/data/seed";
import { STORES } from "@/lib/data/stores";
import { TopBar } from "@/components/ui/bits";
import { StoreCard } from "@/components/customer/store-card";
import { egp, cx } from "@/lib/format";

export default function Offers() {
  const { promoCode, applyPromo } = useCustomer();
  const free = STORES.filter((s) => s.freeDeliveryOver !== undefined);
  return (
    <main className="min-h-dvh pb-24">
      <TopBar title="العروض والأكواد" back="/app" />
      <ul className="space-y-3 px-4">
        {PROMOS.map((p) => {
          const on = promoCode === p.code;
          return (
            <li key={p.code} className="flex overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
              <div className="flex-1 p-4">
                <p className="text-[17px] font-bold">{p.label}</p>
                <p className="mt-1 text-[13px] text-ink-2">{p.minSubtotal ? `على طلب فوق ${egp(p.minSubtotal)}` : "على أي طلب"} • الخصم بيظهر سطر لوحده في الفاتورة</p>
              </div>
              <button onClick={() => { applyPromo(p.code); toast.success(`${p.code} هيتطبق على فاتورتك الجاية`); }} className={cx("flex w-28 flex-col items-center justify-center gap-1 border-s-2 border-dashed border-rule px-2", on ? "bg-stamp-50 text-stamp" : "text-pen")}>
                <span className="text-[14px] font-bold" dir="ltr">{p.code}</span>
                <span className="text-[12px]">{on ? "متفعل" : "فعّله"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-7 px-4 text-[18px] font-semibold">توصيل مجاني بجد</h2>
      <p className="px-4 text-[13.5px] text-ink-2">لما طلبك يعدي الحد المكتوب، سطر التوصيل في الفاتورة بيبقى صفر.</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
        {free.map((s) => <StoreCard key={s.id} store={s} />)}
      </div>
      <Link href="/app/account/points#invite" className="tap mx-4 mt-6 block rounded-[18px] bg-marker-soft p-4">
        <p className="text-[16px] font-semibold">ادعي صحابك وخد 500 نقطة</p>
        <p className="text-[13.5px] text-ink-2">وهما ياخدوا 50 ج.م على أول طلب</p>
      </Link>
    </main>
  );
}

"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { PROMOS } from "@/lib/data/seed";
import { STORES } from "@/lib/data/stores";
import { TopBar, Segmented } from "@/components/ui/bits";
import { StoreRow } from "@/components/customer/store-card";
import { egp, cx } from "@/lib/format";

type Tab = "exclusive" | "coupon" | "delivery";

export default function Offers() {
  return <Suspense><OffersInner /></Suspense>;
}

/** Offers split three ways, matching the home tiles; coupons the customer won (e.g. from the wheel) show first. */
function OffersInner() {
  const f = useSearchParams().get("f");
  const [tab, setTab] = useState<Tab>(f === "coupon" || f === "delivery" ? f : "exclusive");
  const { promoCode, applyPromo } = useCustomer();
  const coupons = [...PROMOS].sort((a, b) => Number(b.code === promoCode) - Number(a.code === promoCode));
  const exclusive = STORES.filter((s) => s.promo && s.open);
  const free = STORES.filter((s) => s.freeDeliveryOver !== undefined);

  return (
    <main className="min-h-dvh pb-24">
      <TopBar title="العروض والكوبونات" back="/app" />
      <div className="px-4 pb-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: "exclusive", label: "حصرية لك" }, { value: "coupon", label: "كوبوناتي" }, { value: "delivery", label: "التوصيل" }]} />
      </div>

      {tab === "coupon" && (
        <ul className="space-y-3 px-4">
          {coupons.map((p) => {
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
      )}

      {tab === "exclusive" && <div className="space-y-3 px-4">{exclusive.map((s) => <StoreRow key={s.id} store={s} />)}</div>}

      {tab === "delivery" && (
        <>
          <p className="px-4 pb-3 text-[13.5px] text-ink-2">لما طلبك يعدي الحد المكتوب، سطر التوصيل في الفاتورة بيبقى صفر.</p>
          <div className="space-y-3 px-4">{free.map((s) => <StoreRow key={s.id} store={s} />)}</div>
        </>
      )}

      <Link href="/app/account#invite" className="tap mx-4 mt-6 block rounded-[18px] bg-pen-50 p-4">
        <p className="text-[16px] font-semibold">اربح 50 ج.م عن كل صديق</p>
        <p className="text-[13.5px] text-ink-2">وصديقك يحصل على 25 ج.م فور تسجيله</p>
      </Link>
    </main>
  );
}

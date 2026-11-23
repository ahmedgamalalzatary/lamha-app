"use client";
import { use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, CircleCheck, IdCard, MapPin, NotebookPen, Phone, Printer } from "lucide-react";
import { usePartner, paymentLabel, storeReceives, STATUS_LABEL } from "@/lib/store/partner";
import { PREP_BEFORE_PICKUP_MIN } from "@/lib/data/admin";
import { money } from "@/components/partner/tw";
import { cx } from "@/lib/format";

/*
 * Store-side order details, copied from the Tawsilty partner app:
 * .impeccable/phone/partner/partner-order-details-preparing-receive-from-driver.png (in progress)
 * .impeccable/phone/partner/partner-order-details-delivered-driver-info.png (delivered)
 */
export default function PartnerOrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders, markReady, accept, reject } = usePartner();
  const o = orders.find((x) => x.id === id);

  if (!o) {
    return (
      <main className="p-8 text-center">
        <p className="text-[18px] text-tw-ink">الطلب مش موجود</p>
        <Link href="/partner/orders" className="mt-4 inline-block text-tw">رجوع لطلباتى</Link>
      </main>
    );
  }

  const count = o.lines.reduce((s, l) => s + l.qty, 0);
  const row = "flex items-center justify-between py-1 text-[16px]";

  return (
    <main className="px-4 pb-8">
      <header className="sticky top-0 z-20 -mx-4 flex items-start justify-between bg-white px-4 pb-3 pt-4">
        <Link href="/partner/orders" aria-label="رجوع" className="tap p-1 text-tw-ink"><ArrowRight className="size-7" /></Link>
        <div className="text-center">
          <h1 className="text-[22px] text-tw-ink">الطلب # {o.number}</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[14px] text-tw-ink-2">
            <CalendarDays className="size-4.5 text-tw" /> {new Date(o.placedAt).toLocaleDateString("en-US")}
          </p>
        </div>
        <button onClick={() => toast("بنطبع الطلب")} aria-label="اطبع" className="tap p-1 text-tw"><Printer className="size-7" /></button>
      </header>

      <span className={cx("mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[16px]", o.status === "done" ? "bg-tw-ok-50 text-tw-ok" : o.status === "rejected" ? "bg-red-50 text-tw-danger" : "bg-tw-50 text-tw-700")}>
        {o.status === "done" && <CircleCheck className="size-5 fill-tw-ok text-white" />} {STATUS_LABEL[o.status]}
      </span>
      <p className="mt-3 text-[22px] font-medium text-tw-ink">{o.customer}</p>

      <div className="mt-6 flex items-center justify-between border-b border-tw-line pb-5">
        <span className="text-[18px] tabular-nums text-tw-ink" dir="ltr">{o.phone}</span>
        <a href={`tel:${o.phone}`} className="tap inline-flex h-12 items-center gap-2 rounded-full border border-tw-ok px-7 text-[18px] text-tw-ok">
          <Phone className="size-5 fill-tw-ok" /> اتصال
        </a>
      </div>

      <section className="flex items-start justify-between border-b border-tw-line py-5">
        <div>
          <h2 className="text-[19px] font-medium text-tw-ink">التوصيل إلى</h2>
          <p className="mt-2 text-[16px] text-tw-ink-2">{o.street}</p>
        </div>
        <MapPin className="size-6 text-tw" />
      </section>

      <section className="flex items-center justify-between border-b border-tw-line py-5">
        <h2 className="text-[19px] font-medium text-tw-ink">موعد التوصيل</h2>
        <span className="text-[17px] text-tw-ink">الآن</span>
      </section>

      {o.note && (
        <section className="border-b border-tw-line py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-medium text-tw-ink">ملاحظات العميل</h2>
            <NotebookPen className="size-6 text-tw" />
          </div>
          <p className="mt-2 text-[17px] text-tw-danger">{o.note}</p>
        </section>
      )}

      <section className="pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-medium text-tw-ink">المنتجات</h2>
          <span className="text-[16px] text-tw">{count} منتج</span>
        </div>
        <ul className="border-b border-tw-line py-2">
          {o.lines.map((l, i) => (
            <li key={i} className={row}>
              <span className="text-tw-ink">{l.qty} × {l.name}{l.opts ? ` - ${l.opts}` : ""}</span>
              <span className="tabular-nums text-tw-ink-2">{money(l.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="border-b border-tw-line py-2">
          <div className={row}><dt className="text-tw-ink">الإجمالى</dt><dd className="tabular-nums text-tw-ink-2">{money(o.subtotal)}</dd></div>
          <div className={row}><dt className="text-tw-ink">كلفة التوصيل</dt><dd className="tabular-nums text-tw-ink-2">{money(o.deliveryFee)}</dd></div>
          <div className={row}><dt className="text-tw-ink">رسوم الخدمة</dt><dd className="tabular-nums text-tw-ink-2">{money(o.serviceFee)}</dd></div>
          <div className={row}><dt className="text-tw-ink">رسوم طريقة الدفع</dt><dd className="tabular-nums text-tw-ink-2">{o.paymentFee.toFixed(2)} ج.م</dd></div>
          {o.discount && <div className={row}><dt className="text-tw-ink">{o.discount.label}</dt><dd className="tabular-nums text-tw-danger">{money(o.discount.amount)}-</dd></div>}
        </dl>
        <dl className="border-b border-tw-line py-3">
          <div className={row}><dt className="text-[18px] font-medium text-tw-ink">المجموع</dt><dd className="text-[18px] font-medium tabular-nums text-tw-ink">{money(o.total)}</dd></div>
          <div className={row}><dt className="text-tw-ink">طريقة الدفع</dt><dd className="font-medium text-tw-ink">{paymentLabel(o)}</dd></div>
        </dl>
      </section>

      {o.rider && (
        <section className="border-b border-tw-line py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-medium text-tw-ink">معلومات المندوب</h2>
            <IdCard className="size-6 text-tw" />
          </div>
          <p className="mt-3 text-[14px] text-tw-ink-2">الاسم</p>
          <p className="text-[18px] text-tw-ink">{o.rider}</p>
        </section>
      )}

      <div className="mt-5 flex items-center justify-between rounded-xl border border-tw-100 bg-tw-50 px-5 py-4 text-[19px] text-tw">
        <span>استلم من المندوب</span>
        <span className="tabular-nums">{money(storeReceives(o))}</span>
      </div>

      {o.status === "preparing" && (
        <>
          <p className="mt-6 border-t border-tw-line pt-5 text-center text-[15px] leading-relaxed text-tw-ink-2">
            يرجى إرسال تجهيز الطلب قبل {PREP_BEFORE_PICKUP_MIN} دقائق من موعد الاستلام ليتسنى للكابتن استلامه في الوقت المحدد.
          </p>
          <button onClick={() => { markReady(o.id); toast.success("تم إرسال تجهيز الطلب للكابتن"); }} className="tap mt-4 h-15 w-full rounded-full bg-tw text-[19px] font-medium text-white">
            تم التجهيز
          </button>
        </>
      )}
      {o.status === "new" && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button onClick={() => { accept(o.id); toast.success(`تم قبول الطلب #${o.number}`); }} className="tap h-13 rounded-md bg-tw-accept text-[18px] text-white">قبول</button>
          <button onClick={() => { reject(o.id); toast(`تم رفض الطلب #${o.number}`); }} className="tap h-13 rounded-md bg-tw-danger text-[18px] text-white">رفض</button>
        </div>
      )}
    </main>
  );
}

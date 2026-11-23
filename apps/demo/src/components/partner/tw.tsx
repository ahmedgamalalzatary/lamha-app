"use client";
/*
 * Partner screens rebuilt from the Tawsilty partner app
 * (.impeccable/phone/partner/partner-home-new-orders-accept-reject-popup.png and
 * partner-order-details-*.png). Tawsilty tokens and font only (tw-*, font-tw).
 */
import Link from "next/link";
import { create } from "zustand";
import { toast } from "sonner";
import { Clock, Download, Headset, Printer, Volume2, VolumeX } from "lucide-react";
import { usePartner, paymentLabel, STATUS_LABEL, type PartnerOrder } from "@/lib/store/partner";
import { cx } from "@/lib/format";

/** Which new order's accept/reject popup is open (shared by the layout and the home list). */
export const useOrderPopup = create<{ id: string | null; open: (id: string) => void; close: () => void }>((set) => ({
  id: null,
  open: (id) => set({ id }),
  close: () => set({ id: null }),
}));

/** Tawsilty partner money format: one decimal ("95.0 ج.م"). */
export const money = (n: number) => `${n.toFixed(1)} ج.م`;

export function since(now: number, at: number) {
  const m = Math.max(1, Math.floor((now - at) / 60_000));
  return m < 60 ? `منذ ${m} دقيقة` : `منذ ${Math.floor(m / 60)} ساعة`;
}

/** The order card on the partner home and orders lists. */
export function OrderCard({ o, now, onDetails }: { o: PartnerOrder; now: number; onDetails?: () => void }) {
  const details = "tap inline-flex h-11 items-center rounded-lg bg-tw-50 px-5 text-[16px] font-medium text-tw-700 shadow-[0_2px_6px_rgb(0_0_0/0.12)]";
  return (
    <li className="relative overflow-hidden rounded-xl bg-white pb-4 pt-14 shadow-[0_2px_10px_rgb(0_0_0/0.10)]">
      <span className="absolute start-0 top-0 rounded-ee-2xl bg-tw-700 px-4 py-2 text-[16px] font-medium text-white">
        #{o.number} - {STATUS_LABEL[o.status]}
      </span>
      <p className="flex items-center gap-1.5 px-4 text-[15px] text-tw-ink"><Clock className="size-4.5" /> {since(now, o.placedAt)}</p>
      <div className="mt-3 flex items-center justify-between gap-3 px-4">
        <button onClick={() => toast("بنوصلك بالدعم الفني")} className="tap inline-flex h-11 items-center gap-2 rounded-lg border border-tw-line px-3 text-[15px] text-tw-ink">
          <Headset className="size-5 text-tw" /> احصل على مساعدة
        </button>
        {onDetails ? (
          <button onClick={onDetails} className={details}>التفاصيل</button>
        ) : (
          <Link href={`/partner/order/${o.id}`} className={details}>التفاصيل</Link>
        )}
      </div>
    </li>
  );
}

/** "طلب رقم #… هل تريد قبول أو رفض الطلب؟" popup over the home list. */
export function NewOrderModal({ o, onClose }: { o: PartnerOrder; onClose: () => void }) {
  const { accept, reject, sound, setSound } = usePartner();
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[440px] items-center bg-black/45 px-4 font-tw" role="dialog" aria-modal aria-label={`طلب رقم ${o.number}`}>
      <div className="w-full rounded-lg bg-white px-5 pb-6 pt-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] text-tw-ink">طلب رقم # {o.number}</p>
            <p className="mt-3 text-[17px] text-tw-ink">هل تريد قبول أو رفض الطلب ?</p>
          </div>
          <button onClick={() => toast("بنطبع الطلب")} aria-label="اطبع" className="tap p-1 text-tw"><Printer className="size-7" /></button>
          <button onClick={() => setSound(!sound)} aria-label={sound ? "اكتم الصوت" : "شغل الصوت"} className="tap p-1 text-tw">
            {sound ? <Volume2 className="size-7" /> : <VolumeX className="size-7" />}
          </button>
        </div>

        {o.note && (
          <>
            <p className="mt-5 text-[19px] font-bold text-tw-ink">ملاحظات العميل</p>
            <p className="mt-1 text-[18px] text-tw-danger">{o.note}</p>
          </>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[18px] text-tw">المنتجات {o.lines.length}</p>
          <button onClick={() => toast("بنحفظ قائمة المنتجات")} aria-label="حمّل المنتجات" className="tap p-1 text-tw"><Download className="size-6" /></button>
        </div>
        <ul className="mt-2 max-h-56 space-y-3 overflow-y-auto">
          {o.lines.map((l, i) => (
            <li key={i} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.img} alt="" className="size-16 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] text-tw-ink">{l.name}{l.opts ? ` - ${l.opts}` : ""}</p>
                <p className="mt-1 text-[16px] text-tw">{money(l.price)}</p>
              </div>
              <span className="shrink-0 rounded-full border border-tw-ink-2 px-3 py-1 text-[14px] text-tw-ink">{l.qty} عناصر</span>
            </li>
          ))}
        </ul>

        {/* [Client] the store sees how the customer pays */}
        <div className="mt-4 flex items-center justify-between border-t border-tw-line pt-3 text-[16px]">
          <span className="text-tw-ink">طريقة الدفع</span>
          <span className="font-bold text-tw-ink">{paymentLabel(o)} • {money(o.total)}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button onClick={() => { accept(o.id); toast.success(`تم قبول الطلب #${o.number}`); onClose(); }} className="tap h-13 rounded-md bg-tw-accept text-[18px] font-medium text-white shadow">قبول</button>
          <button onClick={() => { reject(o.id); toast(`تم رفض الطلب #${o.number}`); onClose(); }} className="tap h-13 rounded-md bg-tw-danger text-[18px] font-medium text-white shadow">رفض</button>
        </div>
      </div>
    </div>
  );
}

export function ScreenTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-center border-b border-tw-line bg-white">
      <h1 className="text-[22px] font-semibold text-tw-ink">{children}</h1>
      {aside && <div className="absolute end-3">{aside}</div>}
    </header>
  );
}

export function EmptyOrders({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <span className="grid size-36 place-items-center rounded-full bg-tw-50"><Clock className="size-14 text-tw-400" /></span>
      <p className="mt-6 text-[20px] font-bold text-tw-ink">{title}</p>
      <p className="mt-2 text-[15px] text-tw-ink-2">{body}</p>
    </div>
  );
}

export const tabCx = (on: boolean) => cx("text-[13px]", on ? "font-semibold text-tw-700" : "text-tw-ink-2");

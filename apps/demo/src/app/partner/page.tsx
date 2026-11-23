"use client";
import { toast } from "sonner";
import { usePartner } from "@/lib/store/partner";
import { EmptyOrders, OrderCard, ScreenTitle, useOrderPopup } from "@/components/partner/tw";
import { useNow } from "@/lib/hooks";
import { ring } from "@/lib/sound";

/* Tawsilty partner home: "الطلبات الجديده" (.impeccable/phone/partner/partner-home-new-orders-accept-reject-popup.png) */
export default function PartnerHome() {
  const now = useNow(30_000);
  const { orders, status, incoming, sound } = usePartner();
  const open = useOrderPopup((s) => s.open);
  const list = orders.filter((o) => o.status === "new");

  return (
    <main>
      <ScreenTitle
        aside={
          <button onClick={() => { const o = incoming(); if (sound) ring(); open(o.id); toast(`طلب جديد #${o.number}`); }} className="tap rounded-md px-2 py-1 text-[12px] text-tw-ink-2 ring-1 ring-tw-line">
            طلب تجريبي
          </button>
        }
      >
        الطلبات الجديده
      </ScreenTitle>
      {list.length === 0 ? (
        <EmptyOrders
          title={status === "closed" ? "المحل مقفول" : "لا توجد طلبات جديدة"}
          body={status === "closed" ? "افتح المحل من حسابي عشان تبدأ تستقبل طلبات" : "أول ما يوصل طلب هتسمع جرس ويظهرلك هنا"}
        />
      ) : (
        <ul className="space-y-4 px-4 pt-5">
          {list.map((o) => <OrderCard key={o.id} o={o} now={now} onDetails={() => open(o.id)} />)}
        </ul>
      )}
    </main>
  );
}

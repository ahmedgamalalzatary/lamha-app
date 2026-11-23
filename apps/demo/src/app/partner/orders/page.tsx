"use client";
import { useState } from "react";
import { usePartner, STATUS_LABEL, type POStatus } from "@/lib/store/partner";
import { EmptyOrders, OrderCard, ScreenTitle } from "@/components/partner/tw";
import { useNow } from "@/lib/hooks";
import { cx } from "@/lib/format";

/* طلباتى: the store's orders by status (the same status tabs as the Tawsilty admin orders page). */
const TABS: POStatus[] = ["preparing", "ready", "out", "done"];

export default function PartnerOrders() {
  const now = useNow(30_000);
  const orders = usePartner((s) => s.orders);
  const [tab, setTab] = useState<POStatus>("preparing");
  const list = orders.filter((o) => o.status === tab);

  return (
    <main>
      <ScreenTitle>طلباتى</ScreenTitle>
      <div className="no-scrollbar sticky top-16 z-10 flex overflow-x-auto border-b border-tw-line bg-white px-2" role="tablist">
        {TABS.map((t) => {
          const n = orders.filter((o) => o.status === t).length;
          return (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("relative h-12 shrink-0 px-3 text-[15px]", tab === t ? "font-semibold text-tw-700" : "text-tw-ink-2")}>
              {STATUS_LABEL[t]} ({n})
              {tab === t && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-tw" />}
            </button>
          );
        })}
      </div>
      {list.length === 0 ? (
        <EmptyOrders title="لا توجد طلبات" body="الطلبات اللي في الحالة دي هتظهر هنا" />
      ) : (
        <ul className="space-y-4 px-4 pt-5">{list.map((o) => <OrderCard key={o.id} o={o} now={now} />)}</ul>
      )}
    </main>
  );
}

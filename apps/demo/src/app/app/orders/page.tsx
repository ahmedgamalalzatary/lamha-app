"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiptText, RotateCcw } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { storeById } from "@/lib/data/stores";
import { orderState, STATUS_TEXT } from "@/lib/order-sim";
import { useNow } from "@/lib/hooks";
import { StoreLogo, Empty, TopBar } from "@/components/ui/bits";
import { Stamp } from "@/components/ui/stamp";
import { LinkButton } from "@/components/ui/button";
import { egp, dateShort, clock } from "@/lib/format";

export default function Orders() {
  const now = useNow(2000);
  const router = useRouter();
  const { orders, reorder } = useCustomer();
  const live = orders.filter((o) => !["delivered", "cancelled"].includes(orderState(o, now).status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(orderState(o, now).status));

  if (orders.length === 0) {
    return (
      <main>
        <TopBar title="طلباتي" back={false} />
        <Empty icon={<ReceiptText className="size-8" />} title="لسه مطلبتش حاجة" body="أول طلب ليك هيظهر هنا بفاتورته كاملة." action={<LinkButton href="/app">اطلب دلوقتي</LinkButton>} />
      </main>
    );
  }

  return (
    <main>
      <TopBar title="طلباتي" back={false} />
      {live.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2 mt-2 text-[15px] font-semibold text-ink-2">شغالة دلوقتي</h2>
          <div className="space-y-3">
            {live.map((o) => {
              const st = orderState(o, now);
              const s = storeById(o.storeId);
              return (
                <Link key={o.id} href={`/app/orders/${o.id}`} className="tap receipt-shadow block">
                  <div className="receipt px-4 pt-4">
                    <div className="flex items-center gap-3">
                      {s ? <StoreLogo store={s} size={42} /> : <span className="grid size-[42px] place-items-center rounded-xl bg-pen font-hand text-xl text-white">م</span>}
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-semibold">{s?.name ?? o.lines[0].name}</p>
                        <p className="text-[13px] text-ink-2">#{o.number} • يوصل خلال {st.remainingMinutes} د</p>
                      </div>
                      <Stamp key={st.status} tone={st.status === "placed" ? "pen" : "stamp"} size="sm" animate>{STATUS_TEXT[st.status].stamp}</Stamp>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pen-50"><div className="h-full bg-pen transition-[width] duration-1000" style={{ width: `${st.progress * 100}%` }} /></div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section className="mt-6 px-4">
        <h2 className="mb-2 text-[15px] font-semibold text-ink-2">اللي فات</h2>
        <ul className="divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
          {past.map((o) => {
            const st = orderState(o, now);
            const s = storeById(o.storeId);
            const refunded = o.refunds.reduce((a, r) => a + r.amount, 0);
            return (
              <li key={o.id} className="flex items-center gap-3 p-3.5">
                <Link href={`/app/orders/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {s ? <StoreLogo store={s} size={42} /> : <span className="grid size-[42px] place-items-center rounded-xl bg-pen font-hand text-xl text-white">م</span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{s?.name ?? "مشوار"}</span>
                      {st.status === "cancelled" && <span className="rounded bg-void-50 px-1.5 text-[11.5px] font-medium text-void">ملغي</span>}
                      {refunded > 0 && <span className="rounded bg-stamp-50 px-1.5 text-[11.5px] font-medium text-stamp">رجع {egp(refunded)}</span>}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-3">{dateShort(o.placedAt)} {clock(o.placedAt)} • {o.lines.map((l) => l.name).join("، ")}</span>
                    <span className="block text-[13.5px] font-medium tabular-nums">{egp(o.quote.total)}</span>
                  </span>
                </Link>
                {o.kind !== "courier" && st.status === "delivered" && (
                  <button onClick={() => { reorder(o.id); router.push("/app/cart"); }} aria-label={`اطلب ${s?.name} تاني`} className="tap grid size-10 shrink-0 place-items-center rounded-full bg-pen-50 text-pen"><RotateCcw className="size-4.5" /></button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

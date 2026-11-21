"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { orderState, STATUS_TEXT } from "@/lib/order-sim";
import { useNow } from "@/lib/hooks";
import { TabBar } from "@/components/customer/tab-bar";
import { CartBar } from "@/components/customer/cart-bar";

const TAB_ROUTES = ["/app", "/app/search", "/app/orders", "/app/account", "/app/restaurants", "/app/offers"];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const onboarded = useCustomer((s) => s.onboarded);
  const [hydrated, setHydrated] = useState(() => useCustomer.persist.hasHydrated());
  const showTabs = TAB_ROUTES.includes(path);
  const showCart = !path.startsWith("/app/cart") && !path.startsWith("/app/welcome") && !path.startsWith("/app/orders/") && !path.startsWith("/app/send");

  useEffect(() => {
    if (hydrated) return;
    Promise.resolve(useCustomer.persist.rehydrate()).finally(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && !onboarded && !path.startsWith("/app/welcome")) router.replace("/app/welcome");
  }, [hydrated, onboarded, path, router]);

  if (!hydrated || (!onboarded && !path.startsWith("/app/welcome"))) return null;

  return (
    <>
      <div className={showTabs ? "pb-24" : ""}>{children}</div>
      <OrderWatcher />
      {showCart && <CartBar raised={showTabs} />}
      {showTabs && <TabBar />}
    </>
  );
}

/** Announces status changes of live orders wherever the customer is in the app. */
function OrderWatcher() {
  const orders = useCustomer((s) => s.orders);
  const now = useNow(1000);
  const path = usePathname();
  const router = useRouter();
  const seen = useRef<Record<string, string>>({});

  useEffect(() => {
    for (const o of orders.slice(0, 3)) {
      const st = orderState(o, now).status;
      const prev = seen.current[o.id];
      seen.current[o.id] = st;
      if (!prev || prev === st || st === "cancelled") continue;
      if (path === `/app/orders/${o.id}`) continue;
      toast(STATUS_TEXT[st].title, {
        description: `طلب #${o.number} • ${STATUS_TEXT[st].line}`,
        action: { label: "تابع", onClick: () => router.push(`/app/orders/${o.id}`) },
      });
    }
  }, [orders, now, path, router]);

  return null;
}

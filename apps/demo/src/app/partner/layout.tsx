"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutList, Rows2, User } from "lucide-react";
import { usePartner } from "@/lib/store/partner";
import { PartnerAuth } from "@/components/partner/auth";
import { NewOrderModal, tabCx, useOrderPopup } from "@/components/partner/tw";
import { cx } from "@/lib/format";
import { ring } from "@/lib/sound";

/* Tawsilty partner tab bar: الرئيسية · طلباتى · منتجات · حسابي */
const TABS = [
  { href: "/partner", label: "الرئيسية", icon: House },
  { href: "/partner/orders", label: "طلباتى", icon: Rows2 },
  { href: "/partner/menu", label: "منتجات", icon: LayoutList },
  { href: "/partner/account", label: "حسابي", icon: User },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { signedIn, status, orders, incoming, tick } = usePartner();
  const { id: popupId, open, close } = useOrderPopup();

  // A new order opens the accept/reject popup on its own.
  useEffect(() => {
    const pending = orders.find((o) => o.status === "new");
    if (pending && !popupId) open(pending.id);
  }, [orders, popupId, open]);

  // Demo: a new order every 40s while open (70s when busy), and the captain moves ready orders on.
  useEffect(() => {
    if (!signedIn) return;
    const every = status === "busy" ? 70_000 : 40_000;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      tick(now);
      if (status === "closed" || usePartner.getState().orders.some((o) => o.status === "new")) { last = now; return; }
      if (now - last >= every) {
        last = now;
        const o = incoming();
        if (usePartner.getState().sound) ring();
        open(o.id);
      }
    }, 5_000);
    return () => clearInterval(t);
  }, [signedIn, status, incoming, tick, open]);

  if (!signedIn) return <PartnerAuth />;

  const popup = orders.find((o) => o.id === popupId && o.status === "new");

  return (
    <div className="min-h-dvh bg-white font-tw">
      <div className="pb-24">{children}</div>
      {popup && <NewOrderModal o={popup} onClose={close} />}
      {!path.startsWith("/partner/order/") && <nav aria-label="تطبيق المحل" className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-tw-line bg-white">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => {
            const on = t.href === "/partner" ? path === "/partner" : path.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className="tap flex h-17 flex-col items-center justify-center gap-1">
                  <t.icon className={cx("size-7", on ? cx("text-tw-700", t.icon === House && "fill-tw-700") : "text-tw-ink-2")} strokeWidth={1.8} />
                  <span className={tabCx(on)}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>}
    </div>
  );
}

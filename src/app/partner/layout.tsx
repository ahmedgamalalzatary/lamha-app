"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, ClipboardList, Store as StoreIcon, UtensilsCrossed } from "lucide-react";
import { usePartner } from "@/lib/store/partner";
import { PartnerAuth } from "@/components/partner/auth";
import { IncomingSheet } from "@/components/partner/incoming";
import { cx } from "@/lib/format";
import { ring } from "@/lib/sound";

const TABS = [
  { href: "/partner", label: "الطلبات", icon: ClipboardList },
  { href: "/partner/menu", label: "المنيو", icon: UtensilsCrossed },
  { href: "/partner/reports", label: "المبيعات", icon: BarChart3 },
  { href: "/partner/account", label: "المحل", icon: StoreIcon },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { signedIn, status, orders, sound, incoming } = usePartner();
  const [incomingId, setIncomingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pending = orders.find((o) => o.status === "new");
    if (pending && !incomingId) setIncomingId(pending.id);
  }, [orders, incomingId]);

  useEffect(() => {
    if (!signedIn || status === "closed") return;
    const every = status === "busy" ? 70_000 : 40_000;
    timer.current = setInterval(() => {
      if (usePartner.getState().orders.some((o) => o.status === "new")) return;
      const o = incoming();
      if (usePartner.getState().sound) ring();
      setIncomingId(o.id);
    }, every);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [signedIn, status, incoming]);

  if (!signedIn) return <PartnerAuth />;

  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <>
      <div className="pb-24">{children}</div>
      <IncomingSheet id={incomingId} onDone={() => setIncomingId(null)} sound={sound} />
      <nav aria-label="تطبيق المحل" className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-rule bg-sheet/95 backdrop-blur-md">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => {
            const on = t.href === "/partner" ? path === "/partner" : path.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className="tap relative flex h-15 flex-col items-center justify-center gap-1 pt-1.5">
                  {on && <motion.span layoutId="ptab" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-pen" />}
                  <span className="relative">
                    <t.icon className={cx("size-[22px]", on ? "text-pen" : "text-ink-3")} strokeWidth={on ? 2.3 : 1.8} />
                    {t.href === "/partner" && newCount > 0 && <span className="absolute -end-2 -top-1 grid size-4.5 place-items-center rounded-full bg-void text-[10.5px] font-bold text-white">{newCount}</span>}
                  </span>
                  <span className={cx("text-[11.5px]", on ? "font-semibold text-pen" : "text-ink-3")}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

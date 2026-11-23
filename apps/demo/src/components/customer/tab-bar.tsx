"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, ShoppingBag, ReceiptText, UserRound } from "lucide-react";
import { useActiveOrder, useCartSummary } from "@/lib/hooks";
import { cx } from "@/lib/format";

const TABS = [
  { href: "/app", label: "الرئيسية", icon: Home },
  { href: "/app/cart", label: "السلة", icon: ShoppingBag },
  { href: "/app/orders", label: "طلباتي", icon: ReceiptText },
  { href: "/app/account", label: "حسابي", icon: UserRound },
];

export function TabBar() {
  const path = usePathname();
  const { order } = useActiveOrder();
  const { count } = useCartSummary();
  const current = TABS.find((t) => t.href === path)?.href ?? (path.startsWith("/app/restaurants") || path.startsWith("/app/offers") || path.startsWith("/app/search") || path.startsWith("/app/pharmacy") ? "/app" : "");

  return (
    <nav aria-label="التنقل الرئيسي" className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-rule bg-sheet/95 backdrop-blur-md">
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const on = current === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className="tap relative flex h-15 flex-col items-center justify-center gap-1 pt-1.5">
                {on && <motion.span layoutId="tab-ink" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-pen" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
                <span className="relative">
                  <t.icon className={cx("size-[22px]", on ? "text-pen" : "text-ink-3")} strokeWidth={on ? 2.3 : 1.8} />
                  {t.href === "/app/cart" && count > 0 && (
                    <span className="absolute -end-2 -top-1.5 grid min-w-4.5 place-items-center rounded-full bg-pen px-1 text-[10.5px] font-bold text-white tabular-nums ring-2 ring-sheet">{count}</span>
                  )}
                  {t.href === "/app/orders" && order && (
                    <span className="absolute -end-1 -top-0.5 size-2.5 rounded-full bg-stamp ring-2 ring-sheet" style={{ animation: "pulse-ring 1.6s infinite" }} aria-label="طلب شغال" />
                  )}
                </span>
                <span className={cx("text-[11.5px]", on ? "font-semibold text-pen" : "text-ink-3")}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

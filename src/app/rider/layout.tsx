"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Navigation, UserRound, Wallet } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/format";

const TABS = [
  { href: "/rider", label: "الشغل", icon: Navigation },
  { href: "/rider/earnings", label: "أرباحي", icon: Wallet },
  { href: "/rider/account", label: "حسابي", icon: UserRound },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { signedIn, signIn } = useRider();
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <main className="flex min-h-dvh flex-col bg-ink text-white">
        <div className="p-2"><Link href="/" aria-label="رجوع" className="tap grid size-10 place-items-center rounded-full hover:bg-white/10"><ChevronRight className="size-6" /></Link></div>
        <div className="flex flex-1 flex-col justify-end px-6 pb-10">
          <Wordmark className="text-[40px]" />
          <h1 className="mt-6 text-[28px] font-bold leading-tight">أهلاً يا كابتن</h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-white/75">مشاويرك، طريقك، وفلوسك كلها واضحة قدامك قبل ما تقبل أي طلب.</p>
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[["سعر المشوار", "قبل القبول"], ["الإكرامية", "ليك كاملة"], ["التحويل", "كل يوم"]].map(([a, b]) => (
              <div key={a} className="rounded-2xl bg-white/8 p-3"><dt className="text-[12px] text-white/60">{a}</dt><dd className="mt-1 text-[14px] font-semibold">{b}</dd></div>
            ))}
          </dl>
          <Button block size="lg" className="mt-8 !bg-marker !text-ink" loading={busy} onClick={() => { setBusy(true); setTimeout(signIn, 600); }}>ادخل كـ محمود (ديمو)</Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="pb-20">{children}</div>
      <nav aria-label="تطبيق الطيار" className="pb-safe fixed inset-x-0 bottom-0 z-[600] mx-auto max-w-[440px] border-t border-rule bg-sheet/95 backdrop-blur-md">
        <ul className="grid grid-cols-3">
          {TABS.map((t) => {
            const on = t.href === "/rider" ? path === "/rider" : t.href === "/rider/account" ? ["/rider/account", "/rider/orders", "/rider/fines"].some((x) => path.startsWith(x)) : path.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className="tap relative flex h-15 flex-col items-center justify-center gap-1 pt-1.5">
                  {on && <motion.span layoutId="rtab" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-pen" />}
                  <t.icon className={cx("size-[22px]", on ? "text-pen" : "text-ink-3")} />
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

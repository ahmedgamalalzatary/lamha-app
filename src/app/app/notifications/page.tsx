"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Bell, Megaphone, ReceiptText, Wallet } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { TopBar, Empty } from "@/components/ui/bits";
import { ago, cx } from "@/lib/format";

const ICON = { order: ReceiptText, offer: Megaphone, wallet: Wallet, system: Bell };

export default function Notifications() {
  const { notices, markNoticesRead } = useCustomer();
  useEffect(() => {
    const t = setTimeout(markNoticesRead, 1200);
    return () => clearTimeout(t);
  }, [markNoticesRead]);
  return (
    <main className="min-h-dvh pb-10">
      <TopBar title="الإشعارات" />
      {notices.length === 0 ? (
        <Empty icon={<Bell className="size-8" />} title="مفيش إشعارات" body="هنبلغك هنا بحالة طلباتك والاستردادات والعروض." />
      ) : (
        <ul className="mx-4 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
          {notices.map((n) => {
            const Icon = ICON[n.kind];
            const body = (
              <>
                <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", n.kind === "wallet" ? "bg-stamp-50 text-stamp" : n.kind === "offer" ? "bg-marker-soft text-ink" : "bg-pen-50 text-pen")}><Icon className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="text-[15px] font-semibold">{n.title}</span>{!n.read && <span className="size-2 rounded-full bg-pen" aria-label="جديد" />}</span>
                  <span className="block text-[14px] leading-relaxed text-ink-2">{n.body}</span>
                  <span className="text-[12px] text-ink-3">{ago(n.at)}</span>
                </span>
              </>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href} className={cx("tap flex gap-3 p-3.5", !n.read && "bg-pen-50/50")}>{body}</Link> : <div className="flex gap-3 p-3.5">{body}</div>}</li>;
          })}
        </ul>
      )}
    </main>
  );
}

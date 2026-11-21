"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ChevronLeft, Gift, Heart, Headset, LayoutGrid, LogOut, MapPin, RotateCcw, Settings, Sparkles, Ticket, Wallet } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { egp } from "@/lib/format";

export default function Account() {
  const router = useRouter();
  const { name, phone, wallet, points, notices, tickets, signOut, resetDemo } = useCustomer();
  const unread = notices.filter((n) => !n.read).length;

  const groups = [
    {
      title: "حسابي",
      items: [
        { href: "/app/account/addresses", icon: MapPin, label: "عناويني" },
        { href: "/app/account/favorites", icon: Heart, label: "المفضلة" },
        { href: "/app/notifications", icon: Bell, label: "الإشعارات", badge: unread || undefined },
        { href: "/app/offers", icon: Ticket, label: "العروض والأكواد" },
        { href: "/app/account/points#invite", icon: Gift, label: "ادعي صحابك وخد 50 ج.م" },
      ],
    },
    {
      title: "الدعم",
      items: [
        { href: "/app/account/support", icon: Headset, label: "المساعدة والشكاوى", badge: tickets.filter((t) => t.status === "open").length || undefined },
        { href: "/app/account/settings", icon: Settings, label: "الإعدادات" },
      ],
    },
  ];

  return (
    <main className="pb-6">
      <header className="bg-pen px-4 pb-16 pt-6 text-white">
        <h1 className="sr-only">حسابي</h1>
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-marker font-hand text-[28px] font-bold text-ink">{name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-semibold">{name}</p>
            <p className="text-[14px] text-white/75" dir="ltr" style={{ textAlign: "right" }}>{phone}</p>
          </div>
          <Link href="/app/account/settings" className="tap rounded-xl bg-white/12 px-3 py-2 text-[13.5px]">تعديل</Link>
        </div>
      </header>

      <div className="-mt-11 grid grid-cols-2 gap-3 px-4">
        <Link href="/app/account/wallet" className="tap rounded-[18px] bg-sheet p-4 shadow-sheet">
          <span className="flex items-center gap-1.5 text-[13.5px] text-ink-2"><Wallet className="size-4.5 text-pen" /> محفظتي</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums">{egp(wallet)}</span>
          <span className="text-[12px] text-pen">اشحن أو شوف الحركات</span>
        </Link>
        <Link href="/app/account/points" className="tap rounded-[18px] bg-sheet p-4 shadow-sheet">
          <span className="flex items-center gap-1.5 text-[13.5px] text-ink-2"><Sparkles className="size-4.5 text-[#c99a00]" /> نقطي</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums">{points}</span>
          <span className="text-[12px] text-pen">تساوي {egp(Math.floor(points / 100) * 10)}</span>
        </Link>
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-6 px-4">
          <h2 className="mb-2 text-[14px] font-semibold text-ink-3">{g.title}</h2>
          <ul className="divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="tap flex items-center gap-3 px-4 py-3.5 hover:bg-paper">
                  <it.icon className="size-5 text-ink-2" />
                  <span className="flex-1 text-[15px]">{it.label}</span>
                  {it.badge ? <span className="grid min-w-5 place-items-center rounded-full bg-void px-1.5 text-[11.5px] font-bold text-white tabular-nums">{it.badge}</span> : null}
                  <ChevronLeft className="size-5 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-6 px-4">
        <h2 className="mb-2 text-[14px] font-semibold text-ink-3">العرض</h2>
        <ul className="divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
          <li><Link href="/" className="tap flex items-center gap-3 px-4 py-3.5"><LayoutGrid className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">بدّل لتطبيق المحلات أو الطيارين</span><ChevronLeft className="size-5 text-ink-3" /></Link></li>
          <li><button onClick={() => { resetDemo(); toast.success("الديمو رجع لأوله"); router.replace("/app/welcome"); }} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start"><RotateCcw className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">ابدأ الديمو من الأول</span></button></li>
          <li><button onClick={() => { signOut(); router.replace("/app/welcome"); }} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start text-void"><LogOut className="size-5" /><span className="flex-1 text-[15px]">تسجيل الخروج</span></button></li>
        </ul>
      </section>
      <p className="mt-6 text-center text-[12px] text-ink-3">لمحة • نسخة عرض 1.0</p>
    </main>
  );
}

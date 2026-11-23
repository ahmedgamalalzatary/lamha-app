"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ChevronLeft, Copy, Gift, Heart, Languages, LayoutGrid, Lightbulb, LogOut, MapPin, RotateCcw, Settings, Share2, Star, Ticket, TriangleAlert, UserRound, Wallet } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { Segmented } from "@/components/ui/bits";
import { egp } from "@/lib/format";

const CODE = "9KJFLB";

/** Account page laid out like Tawsilty's: header + bell, profile row, wallet/points, invite card, then plain rows. */
export default function Account() {
  const router = useRouter();
  const { name, wallet, points, notices, tickets, lang, signOut, resetDemo } = useCustomer();
  const unread = notices.filter((n) => !n.read).length;
  const open = tickets.filter((t) => t.status === "open").length;

  const share = () => {
    const text = `اطلب من لمحة واستخدم كودي ${CODE} وخد 25 ج.م`;
    if (navigator.share) navigator.share({ title: "لمحة", text }).catch(() => {});
    else { navigator.clipboard?.writeText(text).catch(() => {}); toast.success("الرسالة اتنسخت، ابعتها لصحابك"); }
  };

  return (
    <main className="min-h-dvh bg-sheet pb-8">
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="text-[28px] font-bold">حسابي</h1>
        <Link href="/app/notifications" aria-label={`الإشعارات${unread ? `، ${unread} جديد` : ""}`} className="tap relative grid size-12 place-items-center rounded-full bg-paper">
          <Bell className="size-6" />
          {unread > 0 && <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-void px-1 text-[11.5px] font-bold text-white tabular-nums">{unread}</span>}
        </Link>
      </header>

      <Link href="/app/account/settings" className="tap mx-5 mt-3 flex items-center gap-4">
        <span className="grid size-[68px] shrink-0 place-items-center rounded-full bg-pen-50 ring-4 ring-pen-100"><UserRound className="size-9 text-pen" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[20px] font-bold">{name}</span>
          <span className="block text-[14px] text-ink-3">عرض الملف الشخصي</span>
        </span>
        <ChevronLeft className="size-5 text-ink-3" />
      </Link>

      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <Link href="/app/account/wallet" className="tap rounded-[18px] border border-rule p-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold"><Wallet className="size-5 text-pen" /> محفظتي</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums">{egp(wallet)}</span>
        </Link>
        <Link href="/app/account/points" className="tap rounded-[18px] border border-rule p-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold"><Star className="size-5 fill-gold text-gold" /> نقاطي</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums">{points}</span>
        </Link>
      </div>

      {/* Invite friends */}
      <section id="invite" className="relative mx-5 mt-5 scroll-mt-4 overflow-hidden rounded-[22px] bg-gradient-to-l from-pen to-pen-900 p-4 text-white shadow-lift">
        <span className="absolute -start-10 -top-10 size-36 rounded-full bg-white/8" aria-hidden />
        <span className="absolute -bottom-12 end-16 size-32 rounded-full bg-white/8" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Gift className="size-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold">اربح 50 ج.م عن كل صديق</p>
            <p className="text-[12.5px] text-white/85">وصديقك يحصل على 25 ج.م فور تسجيله</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-2.5">
          <button onClick={() => { navigator.clipboard?.writeText(CODE).catch(() => {}); toast.success("الكود اتنسخ"); }} className="tap flex h-12 items-center gap-2 rounded-2xl border border-white/35 bg-white/12 px-3">
            <span className="text-[12.5px] text-white/75">رمزك</span>
            <span className="flex-1 text-center text-[19px] font-bold tracking-[0.18em]" dir="ltr">{CODE}</span>
            <Copy className="size-4.5" />
          </button>
          <button onClick={share} className="tap inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-[15px] font-bold text-pen"><Share2 className="size-5" /> مشاركة</button>
        </div>
      </section>

      {/* Language, visible on the page itself */}
      <section className="mx-5 mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink-3"><Languages className="size-4.5" /> اللغة</h2>
        <Segmented value={lang} onChange={(v) => { useCustomer.setState({ lang: v }); if (v === "en") toast("النسخة الإنجليزية جاية في التطبيق النهائي"); }} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
      </section>

      <Group title="الدعم والمساعدة">
        <Row href="/app/account/support?kind=suggestion" icon={Lightbulb} label="تقديم مقترح" />
        <Row href="/app/account/support?kind=complaint" icon={TriangleAlert} label="تقديم شكوى" badge={open} />
      </Group>
      <Group title="الحساب">
        <Row href="/app/account/settings" icon={Settings} label="إعدادات حسابي" />
        <Row href="/app/account/addresses" icon={MapPin} label="عناويني" />
        <Row href="/app/account/favorites" icon={Heart} label="المفضلة" />
        <Row href="/app/offers" icon={Ticket} label="العروض والأكواد" />
        <Row href="/app/notifications" icon={Bell} label="الإشعارات" badge={unread} />
      </Group>
      <Group title="العرض">
        <Row href="/" icon={LayoutGrid} label="بدّل لتطبيق المحلات أو الطيارين" />
        <li><button onClick={() => { resetDemo(); toast.success("الديمو رجع لأوله"); router.replace("/app/welcome"); }} className="tap flex w-full items-center gap-4 py-4 text-start"><RotateCcw className="size-6 text-ink-2" /><span className="flex-1 text-[16px] font-medium">ابدأ الديمو من الأول</span></button></li>
        <li><button onClick={() => { signOut(); router.replace("/app/welcome"); }} className="tap flex w-full items-center gap-4 py-4 text-start text-void"><LogOut className="size-6" /><span className="flex-1 text-[16px] font-medium">تسجيل الخروج</span></button></li>
      </Group>
      <p className="mt-6 text-center text-[12px] text-ink-3">لمحة • نسخة عرض 1.1</p>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-5 mt-6">
      <h2 className="text-[14px] font-semibold text-ink-3">{title}</h2>
      <ul className="divide-y divide-rule">{children}</ul>
    </section>
  );
}

function Row({ href, icon: Icon, label, badge }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number }) {
  return (
    <li>
      <Link href={href} className="tap flex items-center gap-4 py-4">
        <Icon className="size-6 text-ink-2" />
        <span className="flex-1 text-[16px] font-medium">{label}</span>
        {badge ? <span className="grid min-w-5 place-items-center rounded-full bg-void px-1.5 text-[11.5px] font-bold text-white tabular-nums">{badge}</span> : null}
        <ChevronLeft className="size-5 text-ink-3" />
      </Link>
    </li>
  );
}

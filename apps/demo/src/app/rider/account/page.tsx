"use client";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, CalendarClock, ChevronLeft, ClipboardList, LayoutGrid, Lightbulb, ReceiptText, RotateCcw, Star, TriangleAlert, UserRound } from "lucide-react";
import { useRider } from "@/lib/store/rider";
import { egp } from "@/lib/format";

const hm = (ts: number) => new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const day = (ts: number) => new Date(ts).toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long" });

export default function RiderAccount() {
  const { trips, fines, shifts, notices, reset } = useRider();
  const earned = trips.filter((t) => t.status !== "cancelled").reduce((a, t) => a + t.fee + t.tip, 0);
  const fined = fines.reduce((a, f) => a + f.amount, 0);

  return (
    <main className="min-h-dvh bg-sheet pb-8">
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="text-[28px] font-bold">حسابي</h1>
        <span className="relative grid size-12 place-items-center rounded-full bg-paper">
          <Bell className="size-6" />
          {notices.length > 0 && <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-void px-1 text-[11.5px] font-bold text-white tabular-nums">{notices.length}</span>}
        </span>
      </header>

      <div className="mx-5 mt-3 flex items-center gap-4">
        <span className="grid size-[68px] shrink-0 place-items-center rounded-full bg-pen-50 ring-4 ring-pen-100"><UserRound className="size-9 text-pen" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[20px] font-bold">محمود جمال</span>
          <span className="flex items-center gap-1 text-[14px] text-ink-3"><Star className="size-4 fill-gold text-gold" /> 4.9 • موتوسيكل ف ي ق 482</span>
        </span>
      </div>

      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <Link href="/rider/earnings" className="tap rounded-[18px] border border-rule p-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold"><ReceiptText className="size-5 text-pen" /> فواتيري</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums text-stamp">{egp(earned - fined)}</span>
        </Link>
        <Link href="/rider/fines" className="tap rounded-[18px] border border-rule p-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold"><TriangleAlert className="size-5 text-void" /> الخصومات</span>
          <span className="mt-2 block text-[22px] font-bold tabular-nums text-void">{egp(fined)}</span>
        </Link>
      </div>

      <section className="mx-5 mt-6">
        <h2 className="text-[14px] font-semibold text-ink-3">العمل</h2>
        <ul className="divide-y divide-rule">
          <Row href="/rider/orders" icon={ClipboardList} label="سجل الطلبات" value={`${trips.length}`} />
          <Row href="/rider/fines" icon={TriangleAlert} label="الخصومات والغرامات" value={`${fines.length}`} />
        </ul>
        <h3 className="mt-4 flex items-center gap-2 text-[15px] font-bold"><CalendarClock className="size-5 text-ink-2" /> نوبات عملي</h3>
        <ul className="mt-2 space-y-2">
          {[...shifts].sort((a, b) => a.start - b.start).map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-2xl bg-paper p-3 text-[14px]">
              <span><span className="block font-semibold">{day(s.start)}</span><span className="text-ink-3">{s.zone}</span></span>
              <span className="font-semibold tabular-nums">{hm(s.start)} – {hm(s.end)}</span>
            </li>
          ))}
          {shifts.length === 0 && <li className="rounded-2xl bg-paper p-3 text-[14px] text-ink-3">مفيش نوبات محجوزة. الإدارة بتحدد النوبات.</li>}
        </ul>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="text-[14px] font-semibold text-ink-3">الدعم والمساعدة</h2>
        <ul className="divide-y divide-rule">
          <Btn icon={Lightbulb} label="تقديم مقترح" onClick={() => toast.success("شكراً! وصلنا اقتراحك")} />
          <Btn icon={TriangleAlert} label="تقديم شكوى" onClick={() => toast.success("الشكوى اتسجلت وهنرد خلال ساعة")} />
        </ul>
      </section>
      <section className="mx-5 mt-6">
        <h2 className="text-[14px] font-semibold text-ink-3">العرض</h2>
        <ul className="divide-y divide-rule">
          <Row href="/" icon={LayoutGrid} label="بدّل لتطبيق تاني" />
          <Btn icon={RotateCcw} label="رجّع الديمو لأوله" onClick={() => { reset(); toast.success("بيانات الطيار رجعت لأولها"); }} />
        </ul>
      </section>
    </main>
  );
}

function Row({ href, icon: Icon, label, value }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  return (
    <li>
      <Link href={href} className="tap flex items-center gap-4 py-4">
        <Icon className="size-6 text-ink-2" />
        <span className="flex-1 text-[16px] font-medium">{label}</span>
        {value && <span className="text-[13.5px] text-ink-3 tabular-nums">{value}</span>}
        <ChevronLeft className="size-5 text-ink-3" />
      </Link>
    </li>
  );
}

function Btn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="tap flex w-full items-center gap-4 py-4 text-start">
        <Icon className="size-6 text-ink-2" />
        <span className="flex-1 text-[16px] font-medium">{label}</span>
        <ChevronLeft className="size-5 text-ink-3" />
      </button>
    </li>
  );
}

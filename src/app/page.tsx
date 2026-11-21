"use client";
import Link from "next/link";
import { ChevronLeft, RotateCcw, ShoppingBag, Store as StoreIcon, Bike } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/ui/wordmark";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { BRAND } from "@/lib/brand";
import { useCustomer } from "@/lib/store/customer";
import { usePartner } from "@/lib/store/partner";
import { useRider } from "@/lib/store/rider";

const APPS = [
  { href: "/app", icon: ShoppingBag, title: "تطبيق العميل", body: "اطلب أكل، ماركت، صيدلية، أو ابعت أي حاجة، وتابع طلبك لحظة بلحظة", tag: "ابدأ هنا" },
  { href: "/partner", icon: StoreIcon, title: "تطبيق المحلات", body: "استقبل الطلبات، تحكم في المنيو، وشوف مبيعاتك", tag: "للشركاء" },
  { href: "/rider", icon: Bike, title: "تطبيق الطيارين", body: "مشاوير جديدة، خريطة الطريق، وأرباح اليوم", tag: "للتوصيل" },
];

export default function Hub() {
  const reset = () => {
    useCustomer.getState().resetDemo();
    usePartner.getState().reset();
    useRider.getState().reset();
    toast.success("رجعنا الديمو لأوله");
  };

  return (
    <main className="min-h-dvh pb-10">
      <div className="bg-pen px-5 pb-16 pt-12 text-white">
        <Wordmark className="text-[44px]" blink />
        <p className="mt-4 max-w-[26ch] text-[20px] font-medium leading-snug">{BRAND.tagline}</p>
        <p className="mt-2 text-[14px] text-white/75">توصيل في {BRAND.city}: مطاعم، ماركت، صيدليات، ومشاوير.</p>
      </div>

      <div className="relative -mt-10 px-4">
        <Receipt>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-ink-3">فاتورة وعد لمحة</p>
              <h2 className="text-[18px] font-semibold">اللي بيفرق عن أي تطبيق تاني</h2>
            </div>
            <Stamp tone="stamp" animate className="mt-1">مضمون</Stamp>
          </div>
          <Perf />
          <div className="text-[14.5px]">
            <Row label="رسوم مخفية" amount={0} note="كل قرش مكتوب قبل ما تأكد الطلب، والتوصيل المجاني مجاني بجد" />
            <Row label="إلغاء الطلب">
              <span className="font-semibold text-stamp">مجاناً قبل التأكيد</span>
            </Row>
            <Row label="تعديل الطلب">
              <span className="font-semibold text-stamp">قبل ما المحل يبدأ</span>
            </Row>
            <Row label="صنف غلط أو ناقص">
              <span className="font-semibold text-stamp">فلوسه ترجع فوراً</span>
            </Row>
            <Row label="خدمة العملاء">
              <span className="font-semibold text-stamp">شات مباشر</span>
            </Row>
            <Row label="تسجيل المحلات">
              <span className="font-semibold text-stamp">من الموبايل</span>
            </Row>
          </div>
        </Receipt>
      </div>

      <section className="mt-8 px-4" aria-labelledby="apps">
        <h2 id="apps" className="mb-3 text-[18px] font-semibold">افتح الديمو</h2>
        <div className="space-y-3">
          {APPS.map((a) => (
            <Link key={a.href} href={a.href} className="tap flex items-center gap-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pen-50 text-pen">
                <a.icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[16px] font-semibold">{a.title}</span>
                  <span className="rounded-full bg-marker-soft px-2 py-0.5 text-[11.5px] font-medium text-ink">{a.tag}</span>
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">{a.body}</span>
              </span>
              <ChevronLeft className="size-5 shrink-0 text-ink-3" />
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center gap-2 px-4 text-center">
        <button onClick={reset} className="tap inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-ink-2 hover:bg-pen-50">
          <RotateCcw className="size-4" /> ابدأ الديمو من الأول
        </button>
        <p className="text-[12px] text-ink-3">نسخة عرض: كل المحلات والأسعار والتقييمات بيانات تجريبية</p>
      </div>
    </main>
  );
}

"use client";
import { Copy, Gift, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { TopBar } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Receipt, Row } from "@/components/ui/receipt";
import { egp } from "@/lib/format";

const TIERS = [
  { name: "برونزي", min: 0, perk: "نقطة على كل 10 ج.م" },
  { name: "فضي", min: 300, perk: "توصيل مجاني مرة كل أسبوع" },
  { name: "ذهبي", min: 1000, perk: "دعم أولوية + خصم 10٪ على الماركت" },
];

export default function Points() {
  const points = useCustomer((s) => s.points);
  const tier = [...TIERS].reverse().find((t) => points >= t.min)!;
  const next = TIERS.find((t) => t.min > points);
  return (
    <main className="min-h-dvh pb-10">
      <TopBar title="نقطي" />
      <div className="mx-4 rounded-[22px] bg-ink p-5 text-white">
        <p className="flex items-center gap-2 text-[14px] text-white/75"><Sparkles className="size-4.5 text-marker" /> عضو {tier.name}</p>
        <p className="mt-1 text-[38px] font-bold tabular-nums">{points} <span className="text-[16px] font-medium">نقطة</span></p>
        <p className="text-[13.5px] text-white/75">تساوي {egp(Math.floor(points / 100) * 10)} • كل 100 نقطة = 10 ج.م في الفاتورة</p>
        {next && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-marker" style={{ width: `${(points / next.min) * 100}%` }} /></div>
            <p className="mt-2 text-[13px] text-white/80">فاضلك {next.min - points} نقطة وتبقى {next.name}: {next.perk}</p>
          </div>
        )}
      </div>
      <div className="mt-6 px-4">
        <Receipt>
          <p className="text-[15px] font-semibold">إزاي تجمع نقط</p>
          <div className="mt-1 text-[14.5px]">
            <Row label="كل 10 ج.م في طلب"><span className="font-semibold text-stamp">+1 نقطة</span></Row>
            <Row label="تقييم طلب"><span className="font-semibold text-stamp">+10</span></Row>
            <Row label="صاحبك يطلب أول مرة"><span className="font-semibold text-stamp">+500</span></Row>
          </div>
        </Receipt>
      </div>
      <section id="invite" className="mx-4 mt-6 scroll-mt-20 rounded-[18px] bg-marker-soft p-5">
        <Gift className="size-7 text-ink" />
        <h2 className="mt-2 text-[18px] font-semibold">ادعي صحابك</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">صاحبك ياخد 50 ج.م خصم على أول طلب، وإنت تاخد 500 نقطة لما يطلب.</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-sheet p-2 ps-4">
          <span className="flex-1 text-[17px] font-bold tracking-wider" dir="ltr">AHMED-FY50</span>
          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText("AHMED-FY50").catch(() => {}); toast.success("الكود اتنسخ"); }}><Copy className="size-4" /> انسخ</Button>
        </div>
        <Button block className="mt-3" onClick={() => { if (navigator.share) navigator.share({ title: "لمحة", text: "اطلب من لمحة وخد 50 ج.م بكود AHMED-FY50" }).catch(() => {}); else toast("افتح واتساب وابعت الكود لصحابك"); }}><Share2 className="size-4.5" /> شارك على واتساب</Button>
      </section>
    </main>
  );
}

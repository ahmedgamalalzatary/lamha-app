"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { WHEEL_PRIZES, type Prize } from "@/lib/data/admin";
import { useCustomer } from "@/lib/store/customer";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const N = WHEEL_PRIZES.length;
const SEG = 360 / N;
const COLORS = ["#f55905", "#411517", "#d24803", "#5a1f20"];

function slicePath(i: number, r = 150) {
  const a0 = ((i * SEG - 90 - SEG / 2) * Math.PI) / 180;
  const a1 = (((i + 1) * SEG - 90 - SEG / 2) * Math.PI) / 180;
  return `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
}

/** Home entry card + the wheel sheet. One spin per day. */
export function LuckyWheel() {
  const [open, setOpen] = useState(false);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Prize | null>(null);
  const { lastSpinDay, spinWheel } = useCustomer();
  const usedToday = lastSpinDay === new Date().toDateString();

  const spin = () => {
    if (spinning || usedToday) return;
    const k = Math.floor(Math.random() * N);
    // pointer is at the top: bring slice k to 0°
    const target = angle - (angle % 360) + 360 * 6 - k * SEG;
    setWon(null);
    setSpinning(true);
    setAngle(target);
    setTimeout(() => {
      const p = WHEEL_PRIZES[k];
      spinWheel(p);
      setWon(p);
      setSpinning(false);
      if (p.kind === "none") toast("حظ أوفر المرة الجاية");
      else toast.success(p.kind === "points" ? `كسبت ${p.value} نقطة` : `كسبت ${p.label}، اتطبق على فاتورتك الجاية`);
    }, 4200);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="tap mx-4 mt-6 flex w-[calc(100%-2rem)] items-center gap-3 rounded-[20px] bg-cocoa p-4 text-start text-white">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pen"><Gift className="size-6" /></span>
        <span className="flex-1">
          <span className="block text-[16px] font-bold">لفة الحظ</span>
          <span className="block text-[12.5px] text-white/75">{usedToday ? "استخدمت لفة النهارده، ارجع بكرة" : "لف واكسب خصومات ونقط وتوصيل مجاني"}</span>
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-cocoa">{usedToday ? "بكرة" : "لِف"}</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="لفة الحظ" description="لفة واحدة كل يوم. الجايزة بتتطبق على حسابك على طول.">
        <div className="flex flex-col items-center px-5 pb-8">
          <div className="relative mt-2 size-[300px]">
            <span className="absolute -top-1 start-1/2 z-10 size-0 -translate-x-1/2 border-x-[13px] border-t-[22px] border-x-transparent border-t-gold rtl:translate-x-1/2" aria-hidden />
            <motion.svg viewBox="-160 -160 320 320" className="size-full drop-shadow-xl" animate={{ rotate: angle }} transition={{ duration: 4, ease: [0.12, 0.8, 0.2, 1] }} role="img" aria-label="عجلة الجوايز">
              <circle r="158" fill="#262626" />
              {WHEEL_PRIZES.map((p, i) => {
                const mid = i * SEG - 90;
                return (
                  <g key={p.id}>
                    <path d={slicePath(i)} fill={COLORS[i % COLORS.length]} stroke="#262626" strokeWidth="2" />
                    <text transform={`rotate(${mid + 90}) translate(0 -98)`} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700" fontFamily="var(--font-noto-arabic)">{p.label}</text>
                  </g>
                );
              })}
              <circle r="30" fill="#262626" stroke="#eaa407" strokeWidth="3" />
            </motion.svg>
            <button onClick={spin} disabled={spinning || usedToday} className="absolute start-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[15px] font-bold text-white rtl:translate-x-1/2 disabled:opacity-70">لِف</button>
          </div>
          {won && <p className="mt-4 text-[17px] font-bold">{won.kind === "none" ? "حظ أوفر المرة الجاية" : `مبروك! ${won.label}`}</p>}
          <Button block size="lg" className="mt-5 !bg-gold !text-ink" disabled={spinning || usedToday} onClick={spin}>{usedToday ? "متبقي 0 لفة النهارده" : spinning ? "بتلف…" : "لف العجلة"}</Button>
          <p className="mt-2 text-[12.5px] text-ink-3">{usedToday ? "ارجع بكرة للفة جديدة" : "متبقي 1 لفة النهارده"}</p>
        </div>
      </Sheet>
    </>
  );
}

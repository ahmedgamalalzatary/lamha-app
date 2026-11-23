"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";

const WORDS = ["المطاعم", "البقالة", "الأكلات المفضلة", "أفضل العروض", "الصيدليات", "قهوة"];

/** Search box whose placeholder keeps changing ("ابحث عن …"). */
export function RotatingSearch({ href = "/app/search" }: { href?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <Link href={href} aria-label="ابحث عن المطاعم والبقالة والمزيد" className="tap flex h-12 items-center gap-2.5 rounded-2xl bg-sheet px-2 text-ink-3 shadow-sheet">
      <span className="grid size-9 place-items-center rounded-xl bg-pen-50 text-pen"><Search className="size-5" /></span>
      <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[15px]" aria-hidden>
        <span>ابحث عن</span>
        <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={WORDS[i]} initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -22, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 truncate font-semibold text-ink">
              {WORDS[i]}
            </motion.b>
          </AnimatePresence>
        </span>
      </span>
    </Link>
  );
}

"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { useCartSummary } from "@/lib/hooks";
import { storeById } from "@/lib/data/stores";
import { egp, cx } from "@/lib/format";

export function CartBar({ raised }: { raised?: boolean }) {
  const { count, quote, storeId } = useCartSummary();
  const store = storeId ? storeById(storeId) : undefined;
  const show = count > 0 && !!quote && !!store;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          className={cx("fixed inset-x-0 z-40 mx-auto max-w-[440px] px-3", raised ? "bottom-[76px]" : "bottom-3 pb-[env(safe-area-inset-bottom)]")}
        >
          <Link href="/app/cart" className="tap flex h-15 items-center gap-3 rounded-[18px] bg-pen px-4 text-white shadow-lift">
            <span className="relative grid size-9 place-items-center rounded-xl bg-white/12">
              <ShoppingBag className="size-5" />
              <motion.span key={count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-marker text-[11px] font-bold text-ink tabular-nums">
                {count}
              </motion.span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">شوف الفاتورة</span>
              <span className="block truncate text-[12px] text-white/75">
                {quote!.belowMinimumBy > 0 ? `ناقص ${egp(quote!.belowMinimumBy)} للحد الأدنى` : `من ${store!.name} • التوصيل ${quote!.lines.find((l) => l.key === "delivery")!.amount === 0 ? "مجاني" : egp(quote!.lines.find((l) => l.key === "delivery")!.amount)}`}
              </span>
            </span>
            <span className="text-[16px] font-bold tabular-nums">{egp(quote!.total)}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

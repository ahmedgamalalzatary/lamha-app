"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, Minus, Plus, Star, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cx } from "@/lib/format";
import type { Store } from "@/lib/types";

export function Photo({ src, alt, className, sizes = "(max-width: 440px) 100vw, 440px", priority }: { src?: string; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <div className={cx("relative overflow-hidden bg-pen-50", className)}>
      {src && <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} />}
    </div>
  );
}

export function StoreLogo({ store, size = 44, className }: { store: Pick<Store, "mono" | "name">; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("grid shrink-0 place-items-center rounded-[30%] font-hand font-bold leading-none ring-2 ring-sheet", className)}
      style={{ width: size, height: size, background: store.mono.bg, color: store.mono.fg, fontSize: size * 0.5 }}
    >
      <span className="-translate-y-[6%]">{store.mono.letter}</span>
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 tabular-nums", className)}>
      <Star className="size-3.5 fill-marker text-[#e0b400]" aria-hidden />
      <span className="font-medium text-ink">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-ink-3">({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>}
      <span className="sr-only">تقييم {value} من 5</span>
    </span>
  );
}

export function TopBar({
  title, subtitle, back = true, actions, tone = "paper", className, onBack,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean | string;
  actions?: React.ReactNode;
  tone?: "paper" | "pen" | "clear";
  className?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const bg = tone === "pen" ? "bg-pen text-white" : tone === "clear" ? "bg-transparent" : "bg-paper/92 backdrop-blur-md text-ink";
  return (
    <header className={cx("sticky top-0 z-30 flex h-14 items-center gap-1 px-2", bg, className)}>
      {back && (
        <button
          aria-label="رجوع"
          onClick={() => (onBack ? onBack() : typeof back === "string" ? router.push(back) : router.back())}
          className={cx("tap grid size-10 place-items-center rounded-full", tone === "pen" ? "hover:bg-white/10" : "hover:bg-pen-50")}
        >
          <ChevronRight className="size-6" />
        </button>
      )}
      <div className={cx("min-w-0 flex-1", !back && "ps-3")}>
        {title && <h1 className="truncate text-[17px] font-semibold leading-tight">{title}</h1>}
        {subtitle && <p className={cx("truncate text-[12.5px]", tone === "pen" ? "text-white/75" : "text-ink-3")}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}

export function Stepper({ qty, onChange, min = 0, size = "md", label }: { qty: number; onChange: (n: number) => void; min?: number; size?: "sm" | "md"; label?: string }) {
  const h = size === "sm" ? "h-8" : "h-11";
  const b = size === "sm" ? "size-8" : "size-11";
  return (
    <div className={cx("inline-flex items-center rounded-full bg-sheet ring-1 ring-inset ring-rule", h)} role="group" aria-label={label ? `كمية ${label}` : "الكمية"}>
      <button className={cx("tap grid place-items-center rounded-full text-pen", b)} aria-label="زوّد" onClick={() => onChange(qty + 1)}>
        <Plus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={qty} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="inline-block">
            {qty}
          </motion.span>
        </AnimatePresence>
      </span>
      <button className={cx("tap grid place-items-center rounded-full", b, qty - 1 < Math.max(min, 1) && min === 0 ? "text-void" : "text-pen")} aria-label={qty <= 1 && min === 0 ? "شيل" : "قلّل"} disabled={qty <= min} onClick={() => onChange(qty - 1)}>
        {qty <= 1 && min === 0 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cx("relative grid rounded-2xl bg-pen-50 p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className="relative z-10 h-10 rounded-xl text-[14px] font-medium">
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 -z-10 rounded-xl bg-sheet shadow-sheet" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
          <span className={value === o.value ? "text-pen" : "text-ink-2"}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-stamp" : "bg-rule")}>
      <motion.span layout transition={{ type: "spring", bounce: 0.25, duration: 0.35 }} className={cx("absolute top-0.5 size-6 rounded-full bg-white shadow-sheet", checked ? "right-[22px]" : "right-0.5")} />
    </button>
  );
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-pen-50 text-pen">{icon}</div>
      <h2 className="text-[18px] font-semibold">{title}</h2>
      {body && <p className="mt-1.5 max-w-[30ch] text-[14px] leading-relaxed text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("mt-7", className)}>
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-[18px] font-semibold leading-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Odometer-style digits that flip when they change (used for the live ETA). */
export function FlipNumber({ value, className }: { value: number; className?: string }) {
  const digits = String(value).split("");
  return (
    <span dir="ltr" className={cx("inline-flex tabular-nums [perspective:400px]", className)} aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={`${i}-${d}-${digits.length}`} className="inline-block origin-center" style={{ animation: "flip-in 480ms var(--ease-out-expo) both" }} aria-hidden>
          {d}
        </span>
      ))}
    </span>
  );
}

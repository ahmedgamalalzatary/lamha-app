import { cx } from "@/lib/format";
import { BRAND } from "@/lib/brand";

/** The eye-blink mark: an almond eye whose lid closes for a blink. */
export function EyeMark({ className, blink }: { className?: string; blink?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="14" fill="currentColor" />
      <g style={blink ? { transformOrigin: "24px 24px", animation: "ink-blink 2.6s var(--ease-out-expo) infinite 0.6s" } : undefined}>
        <path d="M8 24c4.5-7 10-10.5 16-10.5S35.5 17 40 24c-4.5 7-10 10.5-16 10.5S12.5 31 8 24Z" fill="#fff" />
        <circle cx="24" cy="24" r="6.2" fill="var(--color-pen)" />
        <circle cx="26.2" cy="21.6" r="1.9" fill="#fff" />
      </g>
    </svg>
  );
}

export function Wordmark({ className, blink }: { className?: string; blink?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-hand font-bold leading-none", className)}>
      <EyeMark className="h-[0.9em] w-[0.9em] text-marker [&_circle:first-of-type]:fill-pen" blink={blink} />
      <span className="-translate-y-[0.06em]">{BRAND.nameAr}</span>
    </span>
  );
}

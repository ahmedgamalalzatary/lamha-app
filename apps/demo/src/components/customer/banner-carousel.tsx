"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BANNERS } from "@/lib/data/admin";
import { Photo } from "@/components/ui/bits";
import { cx } from "@/lib/format";

/** Auto-sliding offers banner with page dots. Banners come from the admin config. */
export function BannerCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (paused.current || !ref.current) return;
      const next = (i + 1) % BANNERS.length;
      const el = ref.current.children[next] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 4000);
    return () => clearInterval(t);
  }, [i]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth;
    setI(Math.min(BANNERS.length - 1, Math.round(Math.abs(el.scrollLeft) / w)));
  };

  return (
    <section aria-label="العروض" className="mt-4">
      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={() => (paused.current = true)}
        onPointerUp={() => setTimeout(() => (paused.current = false), 3000)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {BANNERS.map((b) => (
          <Link key={b.id} href={b.href} className="tap w-full shrink-0 snap-center px-4">
            <div className="relative h-[150px] overflow-hidden rounded-[20px]" style={{ background: b.tone }}>
              <div className="absolute inset-y-0 end-0 w-[58%]"><Photo src={b.img} alt="" className="h-full w-full" sizes="260px" /></div>
              <div className="absolute inset-0" style={{ background: `linear-gradient(to left, ${b.tone} 38%, ${b.tone}cc 52%, transparent 75%)` }} />
              <div className="relative flex h-full w-[60%] flex-col justify-center p-4 text-white">
                <p className="text-[19px] font-bold leading-tight">{b.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-white/85">{b.sub}</p>
                <span className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1 text-[12.5px] font-semibold text-ink">اطلب دلوقتي</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
        {BANNERS.map((b, k) => <span key={b.id} className={cx("h-1.5 rounded-full transition-all duration-300", k === i ? "w-5 bg-pen" : "w-1.5 bg-leader")} />)}
      </div>
    </section>
  );
}

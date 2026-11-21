"use client";
import Link from "next/link";
import { Bike, Clock, Heart } from "lucide-react";
import type { Store } from "@/lib/types";
import { Photo, Rating, StoreLogo } from "@/components/ui/bits";
import { useCustomer } from "@/lib/store/customer";
import { cx } from "@/lib/format";

export function deliveryText(s: Store) {
  if (s.deliveryFee === 0) return "توصيل مجاني";
  return `توصيل ${s.deliveryFee} ج.م`;
}

export function StoreRow({ store }: { store: Store }) {
  const fav = useCustomer((s) => s.favorites.includes(store.id));
  const toggle = useCustomer((s) => s.toggleFavorite);
  return (
    <div className="relative">
      <Link href={`/app/store/${store.id}`} className="tap flex gap-3 rounded-[18px] bg-sheet p-2.5 shadow-sheet">
        <div className="relative">
          <Photo src={store.cover} alt="" className={cx("size-[92px] rounded-[14px]", !store.open && "grayscale")} sizes="92px" />
          <StoreLogo store={store} size={30} className="absolute -bottom-1.5 -start-1.5" />
        </div>
        <div className="min-w-0 flex-1 py-0.5 pe-7">
          <h3 className="truncate text-[16px] font-semibold">{store.name}</h3>
          <p className="truncate text-[13px] text-ink-3">{store.tags.join("، ")} • {store.area}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
            <Rating value={store.rating} count={store.ratingCount} />
            <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="size-3.5 text-ink-3" />{store.etaMin}–{store.etaMax} د</span>
            <span className="inline-flex items-center gap-1 tabular-nums"><Bike className="size-3.5 text-ink-3" />{deliveryText(store)}</span>
          </div>
          {!store.open ? (
            <p className="mt-1.5 text-[12.5px] font-medium text-void">مقفول دلوقتي • بيفتح {store.opensAt}، تقدر تجدول طلبك</p>
          ) : store.promo ? (
            <p className="mt-1.5 inline-block rounded-md bg-marker-soft px-1.5 py-0.5 text-[12px] font-medium text-ink">{store.promo}</p>
          ) : null}
        </div>
      </Link>
      <button onClick={() => toggle(store.id)} aria-label={fav ? `شيل ${store.name} من المفضلة` : `ضيف ${store.name} للمفضلة`} aria-pressed={fav} className="tap absolute end-2 top-2 grid size-9 place-items-center rounded-full">
        <Heart className={cx("size-5", fav ? "fill-void text-void" : "text-ink-3")} />
      </button>
    </div>
  );
}

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/app/store/${store.id}`} className="tap block w-[232px] shrink-0">
      <div className="relative">
        <Photo src={store.cover} alt="" className="aspect-[16/10] rounded-[16px]" sizes="232px" />
        {store.promo && <span className="absolute start-2 top-2 rounded-lg bg-sheet/95 px-2 py-1 text-[11.5px] font-medium text-ink">{store.promo}</span>}
        <StoreLogo store={store} size={38} className="absolute -bottom-3 end-3" />
      </div>
      <h3 className="mt-2.5 truncate text-[15px] font-semibold">{store.name}</h3>
      <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-2">
        <Rating value={store.rating} />
        <span className="text-ink-3">•</span>
        <span className="tabular-nums">{store.etaMin}–{store.etaMax} د</span>
        <span className="text-ink-3">•</span>
        <span className="truncate">{deliveryText(store)}</span>
      </div>
    </Link>
  );
}

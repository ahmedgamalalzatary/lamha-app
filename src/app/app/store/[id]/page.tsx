"use client";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Bike, ChevronRight, Clock, Heart, Info, Lock, Plus, Search, Share2, Star, Store, X } from "lucide-react";
import { storeById } from "@/lib/data/stores";
import { REVIEWS, RATING_BARS } from "@/lib/data/reviews";
import { useCustomer } from "@/lib/store/customer";
import { usePartner, PARTNER_STORE_ID } from "@/lib/store/partner";
import type { MenuItem } from "@/lib/types";
import { Photo, StoreLogo } from "@/components/ui/bits";
import { layoutFor } from "@/lib/data/admin";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { ItemSheet } from "@/components/customer/item-sheet";
import { ConflictSheet } from "@/components/customer/conflict-sheet";
import { RxCard } from "@/components/customer/rx-card";
import { egp, cx } from "@/lib/format";

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = storeById(id);
  if (!store) notFound();
  return <StoreView id={id} />;
}

function StoreView({ id }: { id: string }) {
  const store = storeById(id)!;
  const router = useRouter();
  const { cart, addLine, clearCart, favorites, toggleFavorite, mode } = useCustomer();
  const soldOut = usePartner((s) => s.soldOut);
  const priceOverride = usePartner((s) => s.priceOverride);
  const isPartner = store.id === PARTNER_STORE_ID;
  const grid = layoutFor(store) === "grid";

  const [active, setActive] = useState(store.menu[0]?.id);
  const [itemOpen, setItemOpen] = useState<MenuItem | null>(null);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [solid, setSolid] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const priceOf = (it: MenuItem) => (isPartner && priceOverride[it.id] !== undefined ? priceOverride[it.id] : it.price);
  const isOut = (it: MenuItem) => (isPartner ? !!soldOut[it.id] : !!it.soldOut);

  const menu = useMemo(() => {
    const q = query.trim();
    if (!q) return store.menu;
    return store.menu.map((c) => ({ ...c, items: c.items.filter((i) => i.name.includes(q) || i.desc?.includes(q)) })).filter((c) => c.items.length);
  }, [store.menu, query]);
  const popular = store.menu.flatMap((c) => c.items).filter((i) => i.popular).slice(0, 6);
  const inCart = (itemId: string) => (cart.storeId === store.id ? cart.lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0) : 0);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 170);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = menu.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id.replace("cat-", ""));
    }, { rootMargin: "-120px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [menu]);

  useEffect(() => {
    tabsRef.current?.querySelector(`[data-cat="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const guard = (fn: () => void) => {
    if (cart.storeId && cart.storeId !== store.id && cart.lines.length) setPending(() => fn);
    else fn();
  };

  const addSimple = (it: MenuItem) => guard(() => {
    addLine(store.id, { itemId: it.id, name: it.name, img: it.img, basePrice: priceOf(it), choices: [], qty: 1 });
    toast.success(`${it.name} اتضاف للفاتورة`, { duration: 1500 });
  });

  const onTapItem = (it: MenuItem) => {
    if (isOut(it)) return;
    if (it.options?.length) guard(() => setItemOpen(it));
    else addSimple(it);
  };

  const fav = favorites.includes(store.id);
  const myCount = cart.storeId === store.id ? cart.lines.reduce((n, l) => n + l.qty, 0) : 0;
  const deliveryLine = mode === "pickup" ? "استلام ببلاش" : store.deliveryFee === 0 ? "مجاني" : egp(store.deliveryFee);

  return (
    <main className="pb-28">
      {/* Floating / solid top bar */}
      <div className={cx("fixed inset-x-0 top-0 z-30 mx-auto flex h-14 max-w-[440px] items-center gap-1 px-2 transition-colors duration-300", solid ? "bg-sheet/95 shadow-sheet backdrop-blur" : "bg-transparent")}>
        <button aria-label="رجوع" onClick={() => router.back()} className={cx("tap grid size-10 place-items-center rounded-full", solid ? "" : "bg-sheet/90 shadow-sheet")}>
          <ChevronRight className="size-6" />
        </button>
        <p className={cx("min-w-0 flex-1 truncate px-1 text-[16px] font-semibold transition-opacity", solid ? "opacity-100" : "opacity-0")}>{store.name}</p>
        <button aria-label="دوّر في المنيو" onClick={() => setSearching(true)} className={cx("tap grid size-10 place-items-center rounded-full", solid ? "" : "bg-sheet/90 shadow-sheet")}><Search className="size-5" /></button>
        <button
          aria-label="شارك"
          onClick={() => { navigator.clipboard?.writeText(location.href).catch(() => {}); toast("لينك المحل اتنسخ"); }}
          className={cx("tap grid size-10 place-items-center rounded-full", solid ? "" : "bg-sheet/90 shadow-sheet")}
        >
          <Share2 className="size-5" />
        </button>
        <button aria-label={fav ? "شيل من المفضلة" : "ضيف للمفضلة"} aria-pressed={fav} onClick={() => toggleFavorite(store.id)} className={cx("tap grid size-10 place-items-center rounded-full", solid ? "" : "bg-sheet/90 shadow-sheet")}>
          <motion.span key={String(fav)} initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Heart className={cx("size-5", fav && "fill-void text-void")} /></motion.span>
        </button>
      </div>

      {/* Cover with logo + name on it (Tawsilty style) */}
      <div className="relative h-[270px]">
        <Photo src={store.cover} alt={store.name} className="absolute inset-0" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        <div className="absolute inset-x-0 bottom-12 flex items-end gap-3 px-4 text-white">
          <StoreLogo store={store} size={64} className="shadow-lift ring-4" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-[23px] font-bold leading-tight">{store.name}</h1>
            <button onClick={() => setReviewsOpen(true)} className="tap mt-0.5 inline-flex items-center gap-1.5 text-[13.5px]">
              <Star className="size-4 fill-gold text-gold" /><b className="tabular-nums">{store.rating.toFixed(1)}</b><span className="tabular-nums text-white/75">({store.ratingCount})</span>
              <span className="text-white/75">• {store.tags.join("، ")}</span>
            </button>
          </div>
          <button onClick={() => setInfoOpen(true)} aria-label="معلومات المحل" className="tap mb-1 grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur"><Info className="size-4.5" /></button>
        </div>
      </div>

      <div className="relative -mt-8 rounded-t-[26px] bg-paper px-4 pt-4">
        <dl className="grid grid-cols-3 rounded-[18px] bg-sheet py-3 text-center shadow-sheet">
          <div>
            <dt className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Clock className="size-3.5" /> {mode === "pickup" ? "يجهز في" : "مدة التوصيل"}</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-pen">{mode === "pickup" ? store.etaMin : store.etaMax} دقيقة</dd>
          </div>
          <div className="border-x border-rule">
            <dt className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Bike className="size-3.5" /> رسوم التوصيل</dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{deliveryLine}</dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Store className="size-3.5" /> التوصيل بواسطة</dt>
            <dd className="mt-0.5 text-[15px] font-bold text-pen">{store.lamhaRider ? "لمحة" : "المحل"}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          {store.freeDeliveryOver && mode !== "pickup" && <span className="rounded-md bg-stamp-50 px-2 py-1 font-medium text-stamp">التوصيل مجاني لو الطلب فوق {egp(store.freeDeliveryOver)}</span>}
          {store.promo && <span className="rounded-md bg-marker-soft px-2 py-1 font-medium">{store.promo}</span>}
          <span className="rounded-md bg-sheet px-2 py-1 text-ink-2 ring-1 ring-rule">{store.payments.map((p) => ({ cash: "كاش", card: "كارت", wallet: "محفظة" })[p]).join(" • ")}</span>
        </div>
        {!store.open && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-void-50 p-3 text-[14px] text-ink">
            <Clock className="size-5 shrink-0 text-void" />
            <span>المحل مقفول دلوقتي وبيفتح <b>{store.opensAt}</b>. تقدر تجهز طلبك وتجدوله من الفاتورة.</span>
          </div>
        )}
      </div>

      {grid && !query && (
        <section className="mt-5">
          <h2 className="px-4 text-[19px] font-bold">الأقسام</h2>
          <div className="mt-3 grid grid-cols-4 gap-x-2.5 gap-y-3 px-4">
            {store.menu.map((c) => (
              <button key={c.id} onClick={() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="tap flex flex-col items-center gap-1.5">
                <Photo src={c.items[0]?.img} alt="" className="aspect-square w-full rounded-[16px] ring-1 ring-rule" sizes="90px" />
                <span className="line-clamp-2 text-center text-[12.5px] font-medium leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {store.vertical === "pharmacy" && <RxCard storeId={store.id} />}

      {/* Sticky category tabs */}
      <div className={cx("sticky z-20 mt-4 bg-paper/95 backdrop-blur", "top-14")}>
        {searching ? (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-sheet px-3 ring-1 ring-rule focus-within:ring-2 focus-within:ring-pen">
              <Search className="size-4.5 text-ink-3" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`دوّر في منيو ${store.name}`} className="h-full flex-1 bg-transparent text-[15px] outline-none" />
            </div>
            <button onClick={() => { setSearching(false); setQuery(""); }} aria-label="اقفل البحث" className="tap grid size-10 place-items-center rounded-full"><X className="size-5" /></button>
          </div>
        ) : (
          <div ref={tabsRef} className="no-scrollbar flex gap-1 overflow-x-auto border-b border-rule px-3" role="tablist" aria-label="أقسام المنيو">
            {menu.map((c) => (
              <button
                key={c.id}
                data-cat={c.id}
                role="tab"
                aria-selected={active === c.id}
                onClick={() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className={cx("relative h-12 shrink-0 px-3 text-[14.5px]", active === c.id ? "font-semibold text-pen" : "text-ink-2")}
              >
                {c.name}
                {active === c.id && <motion.span layoutId={`cat-ink-${store.id}`} className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-pen" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query && !grid && popular.length > 0 && (
        <section className="mt-5">
          <h2 className="px-4 text-[18px] font-semibold">الأكثر طلباً</h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {popular.map((it) => (
              <button key={it.id} onClick={() => onTapItem(it)} disabled={isOut(it)} className="tap w-[150px] shrink-0 text-start disabled:opacity-50">
                <div className="relative">
                  <Photo src={it.img} alt="" className="aspect-square rounded-[16px]" sizes="150px" />
                  <span className="absolute bottom-2 end-2 grid size-9 place-items-center rounded-full bg-sheet text-pen shadow-sheet">
                    {inCart(it.id) ? <span className="text-[14px] font-bold tabular-nums">{inCart(it.id)}</span> : <Plus className="size-5" />}
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 text-[14px] font-medium">{it.name}</p>
                <p className="text-[13.5px] font-semibold tabular-nums text-ink-2">{egp(priceOf(it))}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {menu.length === 0 && (
        <p className="px-4 py-12 text-center text-[15px] text-ink-2">مفيش حاجة باسم «{query}» في المنيو. جرب كلمة تانية.</p>
      )}

      {menu.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-[118px] pt-6">
          <h2 className="px-4 text-[18px] font-semibold">{c.name}</h2>
          {grid ? (
            <div className="mt-3 grid grid-cols-2 gap-3 px-4">
              {c.items.map((it) => <GridItem key={it.id} it={it} price={priceOf(it)} out={isOut(it)} qty={inCart(it.id)} onAdd={() => onTapItem(it)} />)}
            </div>
          ) : (
            <ul className="mt-1 px-4">
              {c.items.map((it) => {
                const q = inCart(it.id);
                const out = isOut(it);
                return (
                  <li key={it.id} className="border-b border-rule last:border-0">
                    <button onClick={() => onTapItem(it)} disabled={out} className="tap flex w-full gap-3 py-4 text-start">
                      <div className="min-w-0 flex-1">
                        <h3 className={cx("text-[15.5px] font-semibold", out && "text-ink-3")}>
                          {q > 0 && <span className="me-1.5 rounded-md bg-pen px-1.5 py-0.5 text-[12px] font-bold text-white tabular-nums">{q}×</span>}
                          {it.name}
                        </h3>
                        {it.desc && <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{it.desc}</p>}
                        <p className="mt-2 flex items-center gap-2 text-[14.5px] font-semibold tabular-nums">
                          {out ? <span className="font-medium text-void">خلص النهارده</span> : egp(priceOf(it))}
                          {it.options?.length && !out ? <span className="text-[12px] font-normal text-ink-3">فيه اختيارات</span> : null}
                        </p>
                      </div>
                      <div className="relative shrink-0">
                        <Photo src={it.img} alt="" className={cx("size-[104px] rounded-[14px]", out && "grayscale opacity-60")} sizes="104px" />
                        {!out && (
                          <span className="absolute -bottom-2 start-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-sheet text-pen shadow-lift ring-1 ring-rule rtl:translate-x-1/2">
                            <Plus className="size-5" />
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {myCount === 0 && store.minOrder > 0 && (
        <div className="fixed inset-x-0 bottom-3 z-30 mx-auto max-w-[440px] px-3">
          <div className="rounded-[18px] bg-pen-50 px-4 py-3 shadow-lift ring-1 ring-pen-100">
            <p className="flex items-center gap-2 text-[14px] font-semibold"><Lock className="size-4 text-pen" /> تسوّق الآن وأضف {egp(store.minOrder)} أو أكثر إلى طلبك!</p>
            <div className="mt-2 h-1.5 rounded-full bg-pen-100" />
          </div>
        </div>
      )}

      <ItemSheet
        item={itemOpen}
        open={!!itemOpen}
        price={itemOpen ? priceOf(itemOpen) : undefined}
        onOpenChange={(v) => !v && setItemOpen(null)}
        onAdd={({ choices, qty, note }) => {
          const it = itemOpen!;
          addLine(store.id, { itemId: it.id, name: it.name, img: it.img, basePrice: priceOf(it), choices, qty, note });
          setItemOpen(null);
          toast.success(`${qty}× ${it.name} اتضاف للفاتورة`, { duration: 1600 });
        }}
      />

      <ConflictSheet
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        from={cart.storeId ? storeById(cart.storeId)?.name ?? "" : ""}
        to={store.name}
        onReplace={() => { clearCart(); const fn = pending; setPending(null); fn?.(); }}
      />

      <Sheet open={reviewsOpen} onOpenChange={setReviewsOpen} title={`تقييمات ${store.name}`}>
        <div className="px-5 pb-8">
          <div className="flex items-center gap-5 rounded-2xl bg-paper p-4">
            <div className="text-center">
              <p className="text-[40px] font-bold leading-none tabular-nums">{store.rating.toFixed(1)}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">{store.ratingCount} تقييم</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {RATING_BARS.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-ink-3">
                  <span className="w-3 tabular-nums">{5 - i}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule"><div className="h-full rounded-full bg-[#eaa407]" style={{ width: `${p}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">التقييمات من ناس طلبت فعلاً من المحل ده بس.</p>
          <ul className="mt-4 divide-y divide-rule">
            {REVIEWS.map((r, i) => (
              <li key={i} className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14.5px] font-semibold">{r.name}</span>
                  <span className="flex" aria-label={`${r.stars} نجوم`}>{Array.from({ length: 5 }, (_, k) => <Star key={k} className={cx("size-3.5", k < r.stars ? "fill-marker text-[#eaa407]" : "text-rule")} />)}</span>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{r.text}</p>
                <p className="mt-1 text-[12px] text-ink-3">من {r.days} يوم{r.item ? ` • طلب ${r.item}` : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen} title={store.name} description={`${store.area}، الفيوم`}>
        <dl className="space-y-3 px-5 pb-8 text-[14.5px]">
          {[
            ["المواعيد", store.open ? "مفتوح دلوقتي • لحد 2 بالليل" : `بيفتح ${store.opensAt}`],
            ["المسافة", `${store.distanceKm} كم من عنوانك`],
            ["التوصيل", store.lamhaRider ? "طيارين لمحة، تقدر تتابع الطيار على الخريطة" : "المحل بيوصل بنفسه"],
            ["الدفع", store.payments.map((p) => ({ cash: "كاش عند الاستلام", card: "كارت", wallet: "محفظة لمحة" })[p]).join("، ")],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 border-b border-dotted border-leader pb-3"><dt className="w-20 shrink-0 text-ink-3">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </Sheet>
    </main>
  );
}

function GridItem({ it, price, out, qty, onAdd }: { it: MenuItem; price: number; out: boolean; qty: number; onAdd: () => void }) {
  const setQty = useCustomer((s) => s.setQty);
  const lines = useCustomer((s) => s.cart.lines);
  const line = lines.find((l) => l.itemId === it.id && l.choices.length === 0);
  return (
    <div className="rounded-[16px] bg-sheet p-2 shadow-sheet">
      <div className="relative">
        <Photo src={it.img} alt="" className={cx("aspect-square rounded-[12px]", out && "grayscale opacity-60")} sizes="200px" />
        {it.oldPrice && <Stamp tone="void" size="sm" className="absolute start-1 top-1 !text-[13px]">وفّر {it.oldPrice - price}</Stamp>}
      </div>
      <div className="px-1 pt-2">
        <p className="line-clamp-2 min-h-[2.6em] text-[14px] font-medium leading-snug">{it.name}</p>
        <p className="text-[12px] text-ink-3">{it.unit}</p>
        <div className="mt-2 flex h-9 items-center justify-between">
          <span className="flex flex-col leading-tight">
            <span className="text-[14.5px] font-semibold tabular-nums">{egp(price)}</span>
            {it.oldPrice && <s className="text-[11.5px] text-ink-3 tabular-nums">{egp(it.oldPrice)}</s>}
          </span>
          {out ? (
            <span className="text-[12px] text-void">خلص</span>
          ) : line && qty > 0 ? (
            <span className="inline-flex h-9 items-center rounded-full bg-pen text-white">
              <button aria-label="زوّد" className="grid size-9 place-items-center" onClick={() => setQty(line.key, line.qty + 1)}><Plus className="size-4" /></button>
              <span className="min-w-4 text-center text-[14px] font-bold tabular-nums">{line.qty}</span>
              <button aria-label="قلّل" className="grid size-9 place-items-center text-[20px] leading-none" onClick={() => setQty(line.key, line.qty - 1)}>−</button>
            </span>
          ) : (
            <button aria-label={`ضيف ${it.name}`} onClick={onAdd} className="tap grid size-9 place-items-center rounded-full bg-pen-50 text-pen"><Plus className="size-5" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

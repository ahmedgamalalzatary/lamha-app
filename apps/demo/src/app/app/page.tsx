"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, Heart, MapPin, Percent, Plus, Sparkles, Ticket, Truck, UserPlus, Wallet, X } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { storeById } from "@/lib/data/stores";
import { HOME_SECTIONS, HOME_TILES, MART_BANNER } from "@/lib/data/admin";
import { AddressSheet } from "@/components/customer/address-sheet";
import { LiveOrderStub } from "@/components/customer/live-order-stub";
import { MiniStoreCard } from "@/components/customer/store-card";
import { StoresList } from "@/components/customer/stores-list";
import { RotatingSearch } from "@/components/customer/rotating-search";
import { BannerCarousel } from "@/components/customer/banner-carousel";
import { LuckyWheel } from "@/components/customer/lucky-wheel";
import { Photo, Section } from "@/components/ui/bits";
import { egp } from "@/lib/format";

const OFFER_TILES = [
  { f: "exclusive", title: "عروض حصرية لك", icon: Sparkles, bg: "from-pen to-pen-700" },
  { f: "coupon", title: "استخدم كوبون", icon: Ticket, bg: "from-cocoa to-[#6b2a22]" },
  { f: "delivery", title: "عروض التوصيل", icon: Truck, bg: "from-stamp to-[#037a29]" },
];

export default function Home() {
  const [addrOpen, setAddrOpen] = useState(false);
  const [inviteHidden, setInviteHidden] = useState(false);
  const { addresses, addressId, mode, wallet, points, cart, addLine } = useCustomer();
  const addr = addresses.find((a) => a.id === addressId) ?? addresses[0];
  const mart = storeById(MART_BANNER.storeId)!;
  const martItems = mart.menu.flatMap((c) => c.items).slice(0, 8);

  return (
    <main>
      <header className="sticky top-0 z-30 bg-gradient-to-b from-pen to-[#f7782f] px-4 pb-4 pt-3 text-white">
        <div className="flex items-center gap-2">
          <button onClick={() => setAddrOpen(true)} className="tap flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-start">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20"><MapPin className="size-5" /></span>
            <span className="min-w-0 truncate text-[14.5px]">
              {mode === "pickup" ? "استلام من المحل" : <>التوصيل إلى <b>{addr?.label}</b></>}
            </span>
            <ChevronDown className="size-4 shrink-0" />
          </button>
          <Link href="/app/account/favorites" aria-label="المفضلة" className="tap grid size-10 place-items-center rounded-full hover:bg-white/10"><Heart className="size-[22px]" /></Link>
        </div>
        <div className="mt-3"><RotatingSearch /></div>
      </header>

      <LiveOrderStub />

      {/* Wallet + points shortcuts */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        <Link href="/app/account/points" className="tap flex items-center gap-2.5 rounded-[16px] bg-sheet p-2.5 shadow-sheet">
          <span className="grid size-10 place-items-center rounded-xl bg-pen-50 text-pen"><Sparkles className="size-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">نقاطي</span><span className="block text-[12px] tabular-nums text-ink-3">{points} نقطة</span></span>
          <ChevronLeft className="size-4.5 text-ink-3" />
        </Link>
        <Link href="/app/account/wallet" className="tap flex items-center gap-2.5 rounded-[16px] bg-sheet p-2.5 shadow-sheet">
          <span className="grid size-10 place-items-center rounded-xl bg-pen-50 text-pen"><Wallet className="size-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">المحفظة</span><span className="block text-[12px] tabular-nums text-ink-3">{egp(wallet)}</span></span>
          <ChevronLeft className="size-4.5 text-ink-3" />
        </Link>
      </div>

      {/* Icon grid (order + images from the admin config) */}
      <nav aria-label="الأقسام" className="no-scrollbar mt-5 grid auto-cols-[23%] grid-flow-col grid-rows-2 gap-x-[2.6%] gap-y-3 overflow-x-auto px-4 pt-2">
        {HOME_TILES.map((t) => (
          <Link key={t.id} href={t.href} className="tap flex flex-col items-center gap-1.5">
            <span className="relative w-full">
              <Photo src={t.img} alt="" className="aspect-square w-full rounded-[18px] ring-1 ring-rule" sizes="96px" />
              {t.badge && <span className="absolute -top-2 start-1/2 max-w-[95%] -translate-x-1/2 truncate rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white rtl:translate-x-1/2">{t.badge}</span>}
            </span>
            <span className="line-clamp-2 text-center text-[12.5px] font-medium leading-tight">{t.label}</span>
          </Link>
        ))}
      </nav>

      <h2 className="mt-6 px-4 text-[18px] font-bold">العروض اللي تستاهل تجربها دلوقتي…</h2>
      <BannerCarousel />

      {!inviteHidden && (
        <div className="relative mx-4 mt-5 flex items-center gap-3 rounded-[18px] border border-pen-100 bg-pen-50 p-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pen text-white"><UserPlus className="size-6" /></span>
          <Link href="/app/account#invite" className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-bold">اربح 50 ج.م عن كل صديق</span>
            <span className="block text-[12.5px] text-ink-2">وصديقك يحصل على 25 ج.م فور تسجيله</span>
          </Link>
          <button onClick={() => setInviteHidden(true)} aria-label="اقفل" className="tap absolute end-2 top-2 grid size-7 place-items-center rounded-full text-ink-3"><X className="size-4" /></button>
        </div>
      )}

      <Section title="العروض والكوبونات">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {OFFER_TILES.map((o) => (
            <Link key={o.f} href={`/app/offers?f=${o.f}`} className={`tap relative h-[120px] w-[132px] shrink-0 overflow-hidden rounded-[18px] bg-gradient-to-br ${o.bg} p-3 text-white`}>
              <span className="block text-[16px] font-bold leading-tight">{o.title}</span>
              <o.icon className="absolute bottom-2 start-2 size-12 opacity-30" strokeWidth={1.5} />
              <Percent className="absolute -bottom-3 -end-3 size-16 opacity-15" />
            </Link>
          ))}
        </div>
      </Section>

      {HOME_SECTIONS.map((sec) => (
        <section key={sec.id} className="mt-7 py-5" style={{ background: sec.bg }}>
          <div className="mb-3 flex items-center gap-3 px-4">
            <h2 className="flex-1 text-[19px] font-bold" style={{ color: sec.ink }}>{sec.title}</h2>
            <Photo src={sec.img} alt="" className="size-14 rounded-full ring-4 ring-white/40" sizes="56px" />
          </div>
          <div className="no-scrollbar grid auto-cols-[84%] grid-flow-col grid-rows-3 gap-2.5 overflow-x-auto px-4 pb-1">
            {sec.storeIds.map((id) => storeById(id)).filter(Boolean).map((s) => <MiniStoreCard key={s!.id} store={s!} />)}
          </div>
        </section>
      ))}

      {/* Banner that opens the mart directly + product row */}
      <section className="mt-7">
        <Link href={`/app/store/${mart.id}`} className="tap relative mx-4 block h-[120px] overflow-hidden rounded-[20px] bg-gradient-to-l from-pen-50 to-pen-100">
          <div className="absolute inset-y-0 end-0 w-[42%]"><Photo src={MART_BANNER.img} alt="" className="h-full w-full rounded-s-[60px]" sizes="200px" /></div>
          <div className="relative w-[58%] p-4">
            <p className="text-[21px] font-bold leading-tight text-cocoa">{MART_BANNER.title}</p>
            <p className="mt-1 w-fit rounded-md bg-marker px-1.5 py-0.5 text-[12px] font-semibold text-ink">{MART_BANNER.sub}</p>
          </div>
          <span className="absolute bottom-3 start-3 grid size-9 place-items-center rounded-full bg-sheet shadow-sheet"><ChevronLeft className="size-5" /></span>
        </Link>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {martItems.map((it) => (
            <div key={it.id} className="w-[124px] shrink-0">
              <Link href={`/app/store/${mart.id}`} className="relative block">
                <Photo src={it.img} alt="" className="aspect-square rounded-[16px] ring-1 ring-rule" sizes="124px" />
              </Link>
              <button
                aria-label={`ضيف ${it.name}`}
                onClick={() => {
                  if (cart.storeId && cart.storeId !== mart.id && cart.lines.length) { toast("فاتورتك فيها طلب من محل تاني. كمّله الأول"); return; }
                  addLine(mart.id, { itemId: it.id, name: it.name, img: it.img, basePrice: it.price, choices: [], qty: 1 });
                  toast.success(`${it.name} اتضاف`, { duration: 1200 });
                }}
                className="tap -mt-11 ms-2 relative grid size-9 place-items-center rounded-full bg-sheet text-pen shadow-sheet"
              >
                <Plus className="size-5" />
              </button>
              <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug">{it.name} {it.unit}</p>
              <p className="text-[14px] font-bold tabular-nums">{egp(it.price)}</p>
            </div>
          ))}
        </div>
      </section>

      <LuckyWheel />

      <Section title="كل المطاعم">
        <StoresList />
      </Section>

      <AddressSheet open={addrOpen} onOpenChange={setAddrOpen} />
    </main>
  );
}

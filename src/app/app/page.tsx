"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ChevronDown, ChevronLeft, Copy, Heart, RotateCcw, Search } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { STORES, CUISINES, storeById } from "@/lib/data/stores";
import { orderState } from "@/lib/order-sim";
import { AddressSheet } from "@/components/customer/address-sheet";
import { LiveOrderStub } from "@/components/customer/live-order-stub";
import { StoreCard } from "@/components/customer/store-card";
import { StoresList } from "@/components/customer/stores-list";
import { Photo, Section, StoreLogo } from "@/components/ui/bits";
import { Wordmark } from "@/components/ui/wordmark";
import { egp } from "@/lib/format";

const SERVICES = [
  { href: "/app/restaurants", title: "مطاعم وكافيهات", sub: "+12 مطعم حواليك", img: "/img/burger3.jpg" },
  { href: "/app/store/lamha-mart", title: "لمحة ماركت", sub: "في 20 دقيقة", img: "/img/market1.jpg" },
  { href: "/app/store/shifa-pharmacy", title: "صيدلية", sub: "24 ساعة + الروشتة", img: "/img/pharmacy1.jpg" },
  { href: "/app/send", title: "ابعت أي حاجة", sub: "طيار من مكان لمكان", img: "/img/delivery1.jpg" },
];

export default function Home() {
  const router = useRouter();
  const [addrOpen, setAddrOpen] = useState(false);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const { name, addresses, addressId, mode, notices, orders, reorder } = useCustomer();
  const addr = addresses.find((a) => a.id === addressId) ?? addresses[0];
  const unread = notices.filter((n) => !n.read).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "صباح الخير" : hour < 18 ? "أهلاً" : "مساء الخير";
  const past = orders.filter((o) => o.kind !== "courier" && orderState(o, Date.now()).status === "delivered").slice(0, 4);

  return (
    <main>
      <header className="bg-pen px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-2">
          <Wordmark className="text-[26px]" />
          <button onClick={() => setAddrOpen(true)} className="tap ms-2 min-w-0 flex-1 rounded-xl px-2 py-1 text-start hover:bg-white/10">
            <span className="block text-[11.5px] text-white/70">{mode === "pickup" ? "استلام من المحل" : `التوصيل لـ ${addr?.label ?? ""}`}</span>
            <span className="flex items-center gap-1 text-[14px] font-medium">
              <span className="truncate">{mode === "pickup" ? "هتستلم بنفسك" : `${addr?.area}، ${addr?.street}`}</span>
              <ChevronDown className="size-4 shrink-0" />
            </span>
          </button>
          <Link href="/app/account/favorites" aria-label="المفضلة" className="tap grid size-10 place-items-center rounded-full hover:bg-white/10">
            <Heart className="size-[22px]" />
          </Link>
          <Link href="/app/notifications" aria-label={`الإشعارات${unread ? `، ${unread} جديد` : ""}`} className="tap relative grid size-10 place-items-center rounded-full hover:bg-white/10">
            <Bell className="size-[22px]" />
            {unread > 0 && <span className="absolute end-1.5 top-1.5 grid size-4.5 place-items-center rounded-full bg-marker text-[10.5px] font-bold text-ink">{unread}</span>}
          </Link>
        </div>
        <p className="mt-4 text-[22px] font-semibold">{greet} يا {name}، نفسك في إيه؟</p>
        <Link href="/app/search" className="tap mt-3 flex h-12 items-center gap-2.5 rounded-2xl bg-sheet px-4 text-ink-3">
          <Search className="size-5 text-pen" />
          <span className="text-[15px]">دوّر على أكلة، محل، أو دوا</span>
        </Link>
      </header>

      <LiveOrderStub />

      <nav aria-label="الخدمات" className="mt-4 grid grid-cols-2 gap-3 px-4">
        {SERVICES.map((s, i) => (
          <Link key={s.href} href={s.href} className={`tap relative overflow-hidden rounded-[18px] bg-sheet shadow-sheet ${i === 0 ? "row-span-1" : ""}`}>
            <Photo src={s.img} alt="" className="h-[92px]" sizes="200px" />
            <div className="px-3 pb-3 pt-2.5">
              <span className="block text-[15px] font-semibold">{s.title}</span>
              <span className="block text-[12.5px] text-ink-3">{s.sub}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="mx-4 mt-5 flex items-stretch overflow-hidden rounded-[16px] bg-marker-soft">
        <div className="flex-1 px-4 py-3">
          <p className="text-[15px] font-semibold">خصم 20٪ على البرجر والبيتزا</p>
          <p className="text-[12.5px] text-ink-2">لحد 60 ج.م على طلب فوق 150 ج.م • الخصم بيظهر في الفاتورة سطر لوحده</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText("LAMHA20").catch(() => {});
            useCustomer.getState().applyPromo("LAMHA20");
            toast.success("الكود LAMHA20 اتنسخ وهيتطبق على فاتورتك");
          }}
          className="tap flex flex-col items-center justify-center gap-1 border-s-2 border-dashed border-ink/20 px-4 text-ink"
          aria-label="انسخ الكود LAMHA20"
        >
          <span className="text-[14px] font-bold tracking-wide" dir="ltr">LAMHA20</span>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-2"><Copy className="size-3.5" /> انسخ</span>
        </button>
      </div>

      {past.length > 0 && (
        <Section title="اطلب تاني بضغطة" action={<Link href="/app/orders" className="text-[13.5px] text-pen">كل طلباتي</Link>}>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
            {past.map((o) => {
              const s = storeById(o.storeId)!;
              return (
                <div key={o.id} className="w-[256px] shrink-0 rounded-[18px] bg-sheet p-3 shadow-sheet">
                  <div className="flex items-center gap-2.5">
                    <StoreLogo store={s} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold">{s.name}</p>
                      <p className="truncate text-[12.5px] text-ink-3">{o.lines.map((l) => `${l.qty}× ${l.name}`).join("، ")}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[14px] font-semibold tabular-nums">{egp(o.quote.subtotal)}</span>
                    <button
                      onClick={() => {
                        reorder(o.id);
                        router.push("/app/cart");
                      }}
                      className="tap inline-flex h-9 items-center gap-1.5 rounded-xl bg-pen-50 px-3 text-[13.5px] font-medium text-pen"
                    >
                      <RotateCcw className="size-4" /> اطلبه تاني
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="نفسك في إيه؟">
        <div className="no-scrollbar -mt-1 flex gap-3 overflow-x-auto px-4 pb-1 pt-1.5" role="listbox" aria-label="المطابخ">
          {CUISINES.map((c) => (
            <button key={c.id} role="option" aria-selected={cuisine === c.id} onClick={() => setCuisine(cuisine === c.id ? null : c.id)} className="tap flex w-[72px] shrink-0 flex-col items-center gap-1.5">
              <Photo src={c.img} alt="" className={`size-[68px] rounded-full ring-[3px] ring-offset-2 ring-offset-paper ${cuisine === c.id ? "ring-pen" : "ring-transparent"}`} sizes="68px" />
              <span className={`text-center text-[12.5px] leading-tight ${cuisine === c.id ? "font-semibold text-pen" : "text-ink-2"}`}>{c.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {!cuisine && (
        <Section title="الأعلى تقييماً حواليك" action={<Link href="/app/restaurants" className="inline-flex items-center text-[13.5px] text-pen">الكل <ChevronLeft className="size-4" /></Link>}>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
            {STORES.filter((s) => s.vertical === "food" && s.open && s.rating >= 4.7).map((s) => <StoreCard key={s.id} store={s} />)}
          </div>
        </Section>
      )}

      <Section title={cuisine ? `مطاعم ${cuisine}` : "كل المطاعم"}>
        <StoresList cuisine={cuisine} onClearCuisine={() => setCuisine(null)} />
      </Section>

      <AddressSheet open={addrOpen} onOpenChange={setAddrOpen} />
    </main>
  );
}

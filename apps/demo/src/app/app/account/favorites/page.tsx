"use client";
import { Heart } from "lucide-react";
import { useCustomer } from "@/lib/store/customer";
import { STORES } from "@/lib/data/stores";
import { TopBar, Empty } from "@/components/ui/bits";
import { LinkButton } from "@/components/ui/button";
import { StoreRow } from "@/components/customer/store-card";

export default function Favorites() {
  const favorites = useCustomer((s) => s.favorites);
  const list = STORES.filter((s) => favorites.includes(s.id));
  return (
    <main className="min-h-dvh pb-24">
      <TopBar title="المفضلة" />
      {list.length === 0 ? (
        <Empty icon={<Heart className="size-8" />} title="مفيش محلات في المفضلة" body="دوس على القلب في أي محل وهتلاقيه هنا على طول." action={<LinkButton href="/app">اتفرج على المحلات</LinkButton>} />
      ) : (
        <div className="space-y-3 px-4">{list.map((s) => <StoreRow key={s.id} store={s} />)}</div>
      )}
    </main>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { History, Mic, Search, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { STORES } from "@/lib/data/stores";
import { useCustomer } from "@/lib/store/customer";
import { Photo, StoreLogo } from "@/components/ui/bits";
import { StoreRow } from "@/components/customer/store-card";
import { egp } from "@/lib/format";

const TRENDING = ["شاورما", "كشري", "برجر", "بلطي", "كنافة", "لاتيه", "بيتزا", "فيتامين"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const { recent, pushRecent } = useCustomer();
  const term = q.trim();

  const res = useMemo(() => {
    if (!term) return null;
    const stores = STORES.filter((s) => s.name.includes(term) || s.tags.some((t) => t.includes(term)));
    const items = STORES.flatMap((s) => s.menu.flatMap((c) => c.items.filter((i) => i.name.includes(term) || i.desc?.includes(term)).map((i) => ({ i, s })))).slice(0, 12);
    return { stores, items };
  }, [term]);

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-paper/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="sr-only">البحث</h1>
        <form onSubmit={(e) => { e.preventDefault(); if (term) pushRecent(term); }} className="flex h-12 items-center gap-2 rounded-2xl bg-sheet px-3 ring-1 ring-rule focus-within:ring-2 focus-within:ring-pen">
          <Search className="size-5 text-pen" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="أكلة، محل، منتج، أو دوا" className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" enterKeyHint="search" />
          {q ? (
            <button type="button" aria-label="امسح" onClick={() => setQ("")} className="tap grid size-8 place-items-center rounded-full bg-paper"><X className="size-4" /></button>
          ) : (
            <button type="button" aria-label="بحث بالصوت" onClick={() => { toast("اتكلم... (ديمو)"); setTimeout(() => setQ("شاورما"), 900); }} className="tap grid size-8 place-items-center rounded-full text-pen"><Mic className="size-5" /></button>
          )}
        </form>
      </div>

      {!res && (
        <div className="px-4">
          {recent.length > 0 && (
            <section className="mt-2">
              <h2 className="text-[15px] font-semibold text-ink-2">بحثت قبل كده</h2>
              <ul className="mt-2">
                {recent.map((r) => (
                  <li key={r}><button onClick={() => setQ(r)} className="tap flex w-full items-center gap-3 rounded-xl py-2.5 text-start text-[15px]"><History className="size-4.5 text-ink-3" /> {r}</button></li>
                ))}
              </ul>
            </section>
          )}
          <section className="mt-5">
            <h2 className="text-[15px] font-semibold text-ink-2">الفيوم بتطلب إيه النهارده</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRENDING.map((t) => <button key={t} onClick={() => { setQ(t); pushRecent(t); }} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-sheet px-4 text-[14.5px] ring-1 ring-inset ring-rule"><TrendingUp className="size-4 text-stamp" /> {t}</button>)}
            </div>
          </section>
        </div>
      )}

      {res && (
        <div className="pb-6">
          {res.stores.length === 0 && res.items.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <p className="text-[17px] font-semibold">مفيش نتايج لـ «{term}»</p>
              <p className="mt-1.5 text-[14px] text-ink-2">جرب كلمة أقصر أو اسم أكلة تانية، أو ابعت طيار يجيبهالك من أي مكان.</p>
              <Link href="/app/send" className="tap mt-5 inline-flex h-11 items-center rounded-2xl bg-pen-50 px-4 text-[14.5px] font-medium text-pen">ابعت طيار يجيبها</Link>
            </div>
          ) : (
            <>
              {res.stores.length > 0 && (
                <section className="mt-1">
                  <h2 className="px-4 text-[15px] font-semibold text-ink-2">محلات ({res.stores.length})</h2>
                  <div className="mt-2 space-y-3 px-4">{res.stores.map((s) => <StoreRow key={s.id} store={s} />)}</div>
                </section>
              )}
              {res.items.length > 0 && (
                <section className="mt-6">
                  <h2 className="px-4 text-[15px] font-semibold text-ink-2">أصناف ({res.items.length})</h2>
                  <ul className="mx-4 mt-2 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
                    {res.items.map(({ i, s }) => (
                      <li key={i.id}>
                        <Link href={`/app/store/${s.id}`} onClick={() => pushRecent(term)} className="tap flex items-center gap-3 p-3">
                          <Photo src={i.img} alt="" className="size-14 shrink-0 rounded-xl" sizes="56px" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{i.name}</span>
                            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3"><StoreLogo store={s} size={16} className="!ring-0" /> {s.name}</span>
                          </span>
                          <span className="text-[14px] font-semibold tabular-nums">{egp(i.price)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

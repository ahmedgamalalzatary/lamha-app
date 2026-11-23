"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { TopBar, Switch, Segmented } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { name, phone, lang } = useCustomer();
  const [n, setN] = useState(name);
  const [prefs, setPrefs] = useState({ orders: true, offers: true, sms: false, sound: true });
  return (
    <main className="min-h-dvh pb-10">
      <TopBar title="الإعدادات" />
      <section className="mx-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="text-[16px] font-semibold">بياناتي</h2>
        <label className="mt-3 block"><span className="text-[13px] text-ink-2">الاسم</span><input value={n} onChange={(e) => setN(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-paper px-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" /></label>
        <label className="mt-3 block"><span className="text-[13px] text-ink-2">الموبايل</span><input value={phone} readOnly dir="ltr" className="mt-1 h-12 w-full rounded-xl bg-paper px-3 text-end text-[15px] text-ink-2 outline-none ring-1 ring-rule" /></label>
        <Button className="mt-4" disabled={!n.trim() || n === name} onClick={() => { useCustomer.setState({ name: n.trim() }); toast.success("اتحفظ"); }}>احفظ</Button>
      </section>
      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="mb-2 text-[16px] font-semibold">الإشعارات</h2>
        {([["orders", "حالة طلباتي", "كل ما الطلب يتحرك"], ["offers", "العروض والأكواد", "مرة أو اتنين في الأسبوع بالكتير"], ["sms", "رسايل SMS", "لو النت عندك ضعيف"], ["sound", "صوت الإشعار", ""]] as const).map(([k, l, d]) => (
          <div key={k} className="flex items-center gap-3 border-b border-rule py-3 last:border-0">
            <span className="flex-1"><span className="block text-[15px]">{l}</span>{d && <span className="text-[12.5px] text-ink-3">{d}</span>}</span>
            <Switch checked={prefs[k]} onChange={(v) => setPrefs({ ...prefs, [k]: v })} label={l} />
          </div>
        ))}
      </section>
      <section className="mx-4 mt-4 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <h2 className="mb-3 text-[16px] font-semibold">اللغة</h2>
        <Segmented value={lang} onChange={(v) => { useCustomer.setState({ lang: v }); if (v === "en") toast("النسخة الإنجليزية جاية في التطبيق النهائي"); }} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
      </section>
    </main>
  );
}

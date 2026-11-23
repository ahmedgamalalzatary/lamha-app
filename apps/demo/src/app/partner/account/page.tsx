"use client";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ClipboardList, Clock, Headset, Landmark, LayoutGrid, LogOut, RotateCcw, Users } from "lucide-react";
import { usePartner, PARTNER_STORE_ID } from "@/lib/store/partner";
import { storeById } from "@/lib/data/stores";
import { Photo, StoreLogo, Rating } from "@/components/ui/bits";

export default function PartnerAccount() {
  const store = storeById(PARTNER_STORE_ID)!;
  const { orders, signOut, reset } = usePartner();
  const made = orders.filter((o) => o.status !== "rejected").length;
  const rows = [
    { icon: Clock, label: "مواعيد العمل", value: "12 الظهر – 2 بالليل" },
    { icon: Landmark, label: "حساب التحويل", value: "بنك مصر •••• 7781" },
    { icon: Users, label: "الموظفين", value: "3 كاشير" },
  ];
  return (
    <main className="min-h-dvh pb-6">
      <div className="relative">
        <Photo src={store.cover} alt="" className="h-40" />
        <div className="absolute -bottom-8 start-4"><StoreLogo store={store} size={64} /></div>
      </div>
      <div className="px-4 pt-10">
        <h1 className="text-[21px] font-bold">{store.name}</h1>
        <p className="mt-0.5 flex items-center gap-2 text-[13.5px] text-ink-2"><Rating value={store.rating} count={store.ratingCount} /> • {store.area}</p>
      </div>
      <ul className="mx-4 mt-5 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
        {rows.map((r) => (
          <li key={r.label}><button onClick={() => toast("الإعداد ده متاح في التطبيق النهائي")} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start"><r.icon className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">{r.label}</span><span className="text-[13px] text-ink-3">{r.value}</span><ChevronLeft className="size-5 text-ink-3" /></button></li>
        ))}
        <li><Link href="/partner" className="tap flex items-center gap-3 px-4 py-3.5"><ClipboardList className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">الطلبات اللي اتعملت</span><span className="grid min-w-6 place-items-center rounded-full bg-pen px-1.5 text-[12px] font-bold text-white tabular-nums">{made}</span><ChevronLeft className="size-5 text-ink-3" /></Link></li>
        <li><button onClick={() => toast("بنوصلك بمدير حسابك")} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start"><Headset className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">كلّم مدير حسابك</span><ChevronLeft className="size-5 text-ink-3" /></button></li>
      </ul>
      <ul className="mx-4 mt-4 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
        <li><Link href="/" className="tap flex items-center gap-3 px-4 py-3.5"><LayoutGrid className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">بدّل لتطبيق تاني</span><ChevronLeft className="size-5 text-ink-3" /></Link></li>
        <li><button onClick={() => { reset(); toast.success("بيانات المحل رجعت لأولها"); }} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start"><RotateCcw className="size-5 text-ink-2" /><span className="flex-1 text-[15px]">رجّع الديمو لأوله</span></button></li>
        <li><button onClick={signOut} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start text-void"><LogOut className="size-5" /><span className="flex-1 text-[15px]">تسجيل الخروج</span></button></li>
      </ul>
    </main>
  );
}

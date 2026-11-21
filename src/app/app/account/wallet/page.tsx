"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { TopBar } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { egp, dateShort, cx } from "@/lib/format";

const AMOUNTS = [50, 100, 200, 500];

export default function WalletPage() {
  const { wallet, walletTx, topUp } = useCustomer();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(100);
  const [busy, setBusy] = useState(false);
  return (
    <main className="min-h-dvh pb-10">
      <TopBar title="محفظتي" />
      <div className="mx-4 rounded-[22px] bg-pen p-5 text-white">
        <p className="text-[14px] text-white/75">رصيدك</p>
        <p className="mt-1 text-[38px] font-bold tabular-nums">{egp(wallet)}</p>
        <p className="mt-1 text-[13px] text-white/75">بيتخصم تلقائي لو فعّلته في الفاتورة • الاستردادات بتنزل هنا على طول</p>
        <Button variant="secondary" className="mt-4 !bg-white !text-pen" onClick={() => setOpen(true)}><Plus className="size-4.5" /> اشحن رصيد</Button>
      </div>
      <h2 className="mt-6 px-4 text-[16px] font-semibold">الحركات</h2>
      <ul className="mx-4 mt-2 divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
        {walletTx.map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3.5">
            <span className={cx("grid size-10 place-items-center rounded-xl", t.amount > 0 ? "bg-stamp-50 text-stamp" : "bg-paper text-ink-2")}>{t.amount > 0 ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[14.5px]">{t.label}</span><span className="text-[12.5px] text-ink-3">{dateShort(t.at)}</span></span>
            <span className={cx("text-[15px] font-semibold tabular-nums", t.amount > 0 && "text-stamp")}>{egp(t.amount, { sign: true })}</span>
          </li>
        ))}
      </ul>
      <Sheet open={open} onOpenChange={setOpen} title="اشحن محفظتك" footer={<Button block size="lg" loading={busy} onClick={() => { setBusy(true); setTimeout(() => { topUp(amt); setBusy(false); setOpen(false); toast.success(`اتشحن ${egp(amt)}`); }, 900); }}>ادفع {egp(amt)}</Button>}>
        <div className="px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {AMOUNTS.map((a) => <button key={a} aria-pressed={amt === a} onClick={() => setAmt(a)} className={cx("tap h-12 rounded-xl text-[15px] font-semibold tabular-nums ring-1 ring-inset", amt === a ? "bg-pen text-white ring-pen" : "ring-rule")}>{a}</button>)}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-paper p-3"><CreditCard className="size-5 text-pen" /><span className="flex-1 text-[14.5px]">فيزا •••• 4242</span><span className="text-[12.5px] text-ink-3">محفوظة</span></div>
        </div>
      </Sheet>
    </main>
  );
}

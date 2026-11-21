"use client";
import { useState } from "react";
import { ChevronDown, Headset, Lightbulb, MessageCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useCustomer } from "@/lib/store/customer";
import { TopBar, Segmented } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { ChatSheet } from "@/components/customer/chat-sheet";
import { ago, cx } from "@/lib/format";

const FAQ = [
  ["هل في رسوم خدمة؟", "لأ. اللي بتشوفه في الفاتورة قبل التأكيد هو اللي بتدفعه: الأكل والتوصيل بس، وأي خصم بيظهر سطر لوحده."],
  ["أقدر ألغي الطلب؟", "أيوه ببلاش لحد ما المحل يأكد الطلب، وبيظهرلك عداد في صفحة التتبع. بعد التأكيد كلم الدعم."],
  ["جالي صنف غلط أو ناقص؟", "من صفحة الطلب دوس «في مشكلة؟» واختار الصنف، وفلوسه ترجع محفظتك فوراً."],
  ["التوصيل المجاني بيشتغل إزاي؟", "كل محل كاتب الحد اللي بعده التوصيل مجاني، والفاتورة بتوريك كام فاضلك. لما توصله، سطر التوصيل بيبقى صفر بجد."],
  ["أدفع إزاي؟", "كاش للطيار، كارت، أو من محفظة لمحة. وتقدر تقسم بين المحفظة والكاش."],
];
const TOPICS = { complaint: ["طلب متأخر", "تعامل الطيار", "جودة الأكل", "الدفع والفلوس", "حاجة تانية"], suggestion: ["محل نفسي يبقى موجود", "فكرة للتطبيق", "حاجة تانية"] };

export default function Support() {
  const { tickets, addTicket } = useCustomer();
  const [form, setForm] = useState<null | "complaint" | "suggestion">(null);
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [chat, setChat] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(0);

  return (
    <main className="min-h-dvh pb-10">
      <TopBar title="المساعدة" />
      <div className="px-4">
        <button onClick={() => setChat(true)} className="tap flex w-full items-center gap-3 rounded-[18px] bg-pen p-4 text-start text-white">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><MessageCircle className="size-6" /></span>
          <span className="flex-1"><span className="block text-[16px] font-semibold">كلّم الدعم دلوقتي</span><span className="text-[13px] text-white/80">بشر حقيقيين • متوسط الرد أقل من دقيقة</span></span>
          <span className="size-2.5 rounded-full bg-stamp ring-4 ring-stamp/30" aria-label="متاح" />
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => { setForm("complaint"); setTopic(TOPICS.complaint[0]); }} className="tap rounded-[18px] bg-sheet p-4 text-start shadow-sheet"><TriangleAlert className="size-6 text-void" /><span className="mt-2 block text-[15px] font-semibold">قدّم شكوى</span><span className="text-[12.5px] text-ink-3">بنرد خلال ساعة</span></button>
          <button onClick={() => { setForm("suggestion"); setTopic(TOPICS.suggestion[0]); }} className="tap rounded-[18px] bg-sheet p-4 text-start shadow-sheet"><Lightbulb className="size-6 text-[#c99a00]" /><span className="mt-2 block text-[15px] font-semibold">قدّم اقتراح</span><span className="text-[12.5px] text-ink-3">كل اقتراح بيتقري</span></button>
        </div>

        {tickets.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-[16px] font-semibold">طلباتك للدعم</h2>
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="relative overflow-hidden rounded-[18px] bg-sheet p-4 shadow-sheet">
                  <p className="text-[12.5px] text-ink-3"><span dir="ltr">{t.id}</span> • {t.kind === "complaint" ? "شكوى" : "اقتراح"} • {ago(t.at)}</p>
                  <p className="mt-1 text-[15px] font-semibold">{t.topic}</p>
                  <p className="mt-0.5 line-clamp-2 text-[14px] text-ink-2">{t.text}</p>
                  <Stamp tone="pen" size="sm" className="absolute end-4 top-4">اتسجلت</Stamp>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-[16px] font-semibold">أسئلة بتتكرر</h2>
          <ul className="divide-y divide-rule overflow-hidden rounded-[18px] bg-sheet shadow-sheet">
            {FAQ.map(([q, a], i) => (
              <li key={q}>
                <button aria-expanded={openQ === i} onClick={() => setOpenQ(openQ === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-start">
                  <span className="flex-1 text-[15px] font-medium">{q}</span>
                  <ChevronDown className={cx("size-5 text-ink-3 transition-transform", openQ === i && "rotate-180")} />
                </button>
                {openQ === i && <p className="px-4 pb-4 text-[14px] leading-relaxed text-ink-2">{a}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Sheet open={!!form} onOpenChange={(v) => !v && setForm(null)} title={form === "complaint" ? "قدّم شكوى" : "قدّم اقتراح"} description={form === "complaint" ? "هتاخد رقم متابعة، وهنرد عليك هنا وفي الإشعارات." : "إحنا بنقرا كل اقتراح فعلاً."}
        footer={<Button block size="lg" disabled={text.trim().length < 5} onClick={() => { addTicket({ kind: form!, topic, text: text.trim() }); toast.success(form === "complaint" ? "الشكوى اتسجلت وهنرد خلال ساعة" : "شكراً على اقتراحك!"); setForm(null); setText(""); }}>ابعت</Button>}>
        {form && (
          <div className="px-5 pb-4">
            <Segmented value={topic} onChange={setTopic} options={TOPICS[form].slice(0, 3).map((t) => ({ value: t, label: t }))} />
            <div className="mt-2 flex flex-wrap gap-2">
              {TOPICS[form].slice(3).map((t) => <button key={t} aria-pressed={topic === t} onClick={() => setTopic(t)} className={cx("tap h-9 rounded-full px-3.5 text-[13.5px] ring-1 ring-inset", topic === t ? "bg-ink text-white ring-ink" : "ring-rule")}>{t}</button>)}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={form === "complaint" ? "احكيلنا حصل إيه، وفي أي طلب" : "اقتراحك إيه؟"} className="mt-4 w-full resize-none rounded-2xl bg-paper p-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-3"><Headset className="size-4" /> لو الموضوع مستعجل، الشات أسرع.</p>
          </div>
        )}
      </Sheet>
      <ChatSheet who={chat ? "support" : null} onClose={() => setChat(false)} orderNumber={1045} riderName="" />
    </main>
  );
}

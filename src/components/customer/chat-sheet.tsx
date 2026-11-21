"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SendHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cx, clock } from "@/lib/format";

type Msg = { from: "me" | "them"; text: string; at: number };

const QUICK = {
  rider: ["أنا مستني تحت", "الدور التالت، الجرس مش شغال", "سيبه مع البواب", "اتأخرت ليه؟"],
  support: ["فين طلبي؟", "عايز أغير العنوان", "في مشكلة في الدفع", "عايز أكلم حد"],
};
const REPLY = {
  rider: ["تمام يا فندم، أنا على بعد 5 دقايق", "ماشي، هتصل لما أوصل", "حاضر يا باشا"],
  support: ["أهلاً بيك! أنا سارة من دعم لمحة. شايفة طلبك قدامي ومتابعاه معاك لحظة بلحظة.", "تمام، عملت اللازم. لو في أي حاجة تانية أنا هنا.", "حاضر، هحولك لزميلي يكلمك في خلال دقيقتين."],
};

export function ChatSheet({ who, onClose, orderNumber, riderName }: { who: null | "rider" | "support"; onClose: () => void; orderNumber: number; riderName: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const n = useRef(0);

  useEffect(() => {
    if (!who) return;
    n.current = 0;
    setMsgs([{ from: "them", text: who === "rider" ? `أهلاً، أنا ${riderName} طيار طلبك #${orderNumber}` : `أهلاً بيك في دعم لمحة. بنرد في أقل من دقيقة. إزاي نساعدك في طلب #${orderNumber}؟`, at: Date.now() }]);
  }, [who, orderNumber, riderName]);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, typing]);

  const send = (t: string) => {
    if (!t.trim() || !who) return;
    setMsgs((m) => [...m, { from: "me", text: t.trim(), at: Date.now() }]);
    setText("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const r = REPLY[who][n.current % REPLY[who].length];
      n.current += 1;
      setMsgs((m) => [...m, { from: "them", text: r, at: Date.now() }]);
    }, 1300);
  };

  return (
    <Sheet open={!!who} onOpenChange={(v) => !v && onClose()} full title={who === "rider" ? riderName : "دعم لمحة"} description={who === "rider" ? "الطيار شايف رسايلك • رقمك مخفي" : "متوسط الرد: أقل من دقيقة"}
      footer={
        <div className="pb-1">
          <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5">
            {who && QUICK[who].map((q) => <button key={q} onClick={() => send(q)} className="tap h-9 shrink-0 rounded-full bg-pen-50 px-3.5 text-[13.5px] text-pen">{q}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة" className="h-12 min-w-0 flex-1 rounded-2xl bg-paper px-4 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
            <button type="submit" aria-label="ابعت" disabled={!text.trim()} className="tap grid size-12 place-items-center rounded-2xl bg-pen text-white disabled:bg-pen/40"><SendHorizontal className="size-5 rotate-180" /></button>
          </form>
        </div>
      }>
      <div className="space-y-2 px-4 py-3">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx("flex", m.from === "me" ? "justify-start" : "justify-end")}>
            <div className={cx("max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed", m.from === "me" ? "rounded-ss-md bg-pen text-white" : "rounded-se-md bg-paper text-ink")}>
              {m.text}
              <span className={cx("mt-0.5 block text-[11px]", m.from === "me" ? "text-white/70" : "text-ink-3")}>{clock(m.at)}</span>
            </div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex justify-end"><div className="flex gap-1 rounded-2xl bg-paper px-4 py-3">{[0, 1, 2].map((d) => <span key={d} className="size-2 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${d * 200}ms` }} />)}</div></div>
        )}
        <div ref={end} />
      </div>
    </Sheet>
  );
}

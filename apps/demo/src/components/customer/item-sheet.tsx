"use client";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Photo, Stepper } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/types";
import { selectedChoices, toggleChoice, validateChoices, type Selection } from "@/lib/options";
import { lineUnitPrice } from "@/lib/pricing";
import { egp, cx } from "@/lib/format";

export function ItemSheet({
  item, open, onOpenChange, onAdd, price,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (args: { choices: ReturnType<typeof selectedChoices>; qty: number; note?: string }) => void;
  price?: number;
}) {
  const [sel, setSel] = useState<Selection>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (open && item) {
      const pre: Selection = {};
      item.options?.forEach((g) => {
        if (g.required && g.max === 1 && g.choices[0]?.price === 0 && g.name === "الحجم") pre[g.id] = [g.choices[0].id];
      });
      setSel(pre);
      setQty(1);
      setNote("");
      setTried(false);
    }
  }, [open, item]);

  const groups = useMemo(() => item?.options ?? [], [item]);
  const v = validateChoices(groups, sel);
  const choices = selectedChoices(groups, sel);
  const base = price ?? item?.price ?? 0;
  const total = lineUnitPrice({ basePrice: base, choices }) * qty;

  if (!item) return null;

  const submit = () => {
    if (!v.ok) {
      setTried(true);
      document.getElementById(`grp-${v.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd({ choices, qty, note: note.trim() || undefined });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <div className="flex items-center gap-3">
          <Stepper qty={qty} onChange={(n) => setQty(Math.max(1, n))} min={1} label={item.name} />
          <Button block size="lg" onClick={submit} className="flex-1">
            <span>ضيف للفاتورة</span>
            <span className="tabular-nums opacity-90">• {egp(total)}</span>
          </Button>
        </div>
      }
    >
      <Photo src={item.img} alt={item.name} className="mx-4 mt-2 aspect-[16/10] rounded-[18px]" />
      <div className="px-5 pt-4">
        <h2 className="text-[22px] font-bold leading-tight">{item.name}</h2>
        {item.desc && <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{item.desc}</p>}
        <p className="mt-2 text-[17px] font-semibold tabular-nums text-pen">
          {egp(base)} {item.unit && <span className="text-[13px] font-normal text-ink-3">/ {item.unit}</span>}
        </p>
      </div>

      {groups.map((g) => {
        const missing = tried && v.missing.includes(g.id);
        return (
          <fieldset key={g.id} id={`grp-${g.id}`} className="mt-5 border-t-[6px] border-paper px-5 pt-4">
            <legend className="sr-only">{g.name}</legend>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[16px] font-semibold">{g.name}</p>
                <p className={cx("text-[12.5px]", missing ? "font-medium text-void" : "text-ink-3")}>
                  {missing ? "لازم تختار هنا الأول" : g.max === 1 ? "اختار 1" : `اختار لحد ${g.max}`}
                </p>
              </div>
              <span className={cx("rounded-md px-2 py-0.5 text-[11.5px] font-medium", g.required ? (missing ? "bg-void text-white" : v.missing.includes(g.id) ? "bg-ink text-white" : "bg-stamp-50 text-stamp") : "bg-paper text-ink-3")}>
                {g.required ? (v.missing.includes(g.id) ? "مطلوب" : "تمام") : "اختياري"}
              </span>
            </div>
            <div className="mt-2" role={g.max === 1 ? "radiogroup" : "group"}>
              {g.choices.map((c) => {
                const on = sel[g.id]?.includes(c.id) ?? false;
                const full = !on && g.max > 1 && (sel[g.id]?.length ?? 0) >= g.max;
                return (
                  <button
                    key={c.id}
                    role={g.max === 1 ? "radio" : "checkbox"}
                    aria-checked={on}
                    disabled={full}
                    onClick={() => setSel({ ...sel, [g.id]: toggleChoice(g, sel[g.id] ?? [], c.id) })}
                    className="flex w-full items-center gap-3 border-b border-rule py-3.5 text-start last:border-0 disabled:opacity-40"
                  >
                    <span className={cx("grid size-6 shrink-0 place-items-center border-2 transition-colors", g.max === 1 ? "rounded-full" : "rounded-md", on ? "border-pen bg-pen text-white" : "border-leader")}>
                      {on && (g.max === 1 ? <span className="size-2 rounded-full bg-white" /> : <Check className="size-4" strokeWidth={3} />)}
                    </span>
                    <span className="flex-1 text-[15px]">{c.name}</span>
                    <span className="text-[14px] tabular-nums text-ink-2">{c.price > 0 ? `+${egp(c.price)}` : ""}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="mt-5 border-t-[6px] border-paper px-5 pb-6 pt-4">
        <label htmlFor="note" className="text-[16px] font-semibold">ملاحظة للمحل</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} rows={2} placeholder="مثلاً: من غير بصل، الصوص على جنب" className="mt-2 w-full resize-none rounded-2xl bg-paper p-3 text-[15px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
        <p className="text-start text-[12px] text-ink-3 tabular-nums">{note.length}/120</p>
      </div>
    </Sheet>
  );
}

import { cx, egp } from "@/lib/format";

export function Receipt({ children, className, top }: { children: React.ReactNode; className?: string; top?: boolean }) {
  return (
    <div className="receipt-shadow">
      <div className={cx(top ? "receipt-top" : "receipt", "px-4 pt-4", className)}>{children}</div>
    </div>
  );
}

export function Row({
  label, amount, note, struck, tone = "ink", bold, children, className,
}: {
  label: React.ReactNode;
  amount?: number;
  note?: React.ReactNode;
  struck?: number;
  tone?: "ink" | "stamp" | "void" | "muted";
  bold?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const color = tone === "stamp" ? "text-stamp" : tone === "void" ? "text-void" : tone === "muted" ? "text-ink-3" : "text-ink";
  return (
    <div className={cx("py-1.5", className)}>
      <div className={cx("flex items-baseline", color, bold ? "font-semibold" : "")}>
        <span className="shrink-0">{label}</span>
        <span className="leader" aria-hidden />
        {struck !== undefined && <s className="me-2 text-[13px] text-ink-3 decoration-void/70 decoration-2">{egp(struck)}</s>}
        {amount !== undefined && <span className="shrink-0 tabular-nums">{egp(amount)}</span>}
        {children}
      </div>
      {note && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{note}</p>}
    </div>
  );
}

export function Perf({ className }: { className?: string }) {
  return <div className={cx("perf", className)} role="separator" />;
}

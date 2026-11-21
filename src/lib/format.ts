const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Money as the receipt prints it: tabular western digits + ج.م */
export function egp(n: number, opts: { sign?: boolean } = {}): string {
  const abs = nf.format(Math.abs(n));
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}${abs} ج.م`;
}

export function num(n: number): string {
  return nf.format(n);
}

const rtf = new Intl.RelativeTimeFormat("ar-EG-u-nu-latn", { numeric: "auto" });

export function ago(ts: number, now = Date.now()): string {
  const s = Math.round((ts - now) / 1000);
  const a = Math.abs(s);
  if (a < 60) return "دلوقتي";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString("ar-EG-u-nu-latn", { hour: "numeric", minute: "2-digit" });
}

export function dateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long" });
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

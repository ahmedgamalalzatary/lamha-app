import { type CouponTerms, formatAmount, type PaidBy } from '@tawsela/shared';

/** "خصم 6 ج.م على 150 ج.م", "خصم 20% (حتى 50 ج.م)": the same words the app shows (§8.4). */
export function couponText(c: CouponTerms & { minOrder: number }): string {
  const off = c.kind === 'percent' ? `${c.value}%` : formatAmount(c.value);
  const cap = c.kind === 'percent' && c.maxDiscount !== null ? ` (حتى ${formatAmount(c.maxDiscount)})` : '';
  return c.minOrder > 0 ? `خصم ${off}${cap} على ${formatAmount(c.minOrder)}` : `خصم ${off}${cap}`;
}

export const PAID_BY_LABEL: Record<PaidBy, string> = { app: 'التطبيق', store: 'المتجر' };

const CAIRO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** "2026-11-30" as shown in a date field, for a stored time (the day in Cairo). */
export const cairoDate = (iso: string | null) => (iso ? CAIRO_DAY.format(new Date(iso)) : '');

/**
 * The last second of a day in Cairo, as ISO: a code "صالح حتى 30 نوفمبر" works all that day.
 * Cairo is UTC+2, or +3 in summer time; the offset that keeps the day is the right one.
 */
export function endOfCairoDay(day: string): string | null {
  if (!day) return null;
  for (const offset of ['+03:00', '+02:00']) {
    const at = new Date(`${day}T23:59:59${offset}`);
    if (CAIRO_DAY.format(at) === day && CAIRO_DAY.format(new Date(at.getTime() + 1000)) !== day) return at.toISOString();
  }
  return new Date(`${day}T23:59:59+02:00`).toISOString();
}

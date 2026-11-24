// Formatters for money, phones and times (contract §7). Latin digits everywhere, as Tawsilty.

export type Locale = 'ar' | 'en';

const CURRENCY: Record<Locale, string> = { ar: 'ج.م', en: 'EGP' };
const MINUTES: Record<Locale, string> = { ar: 'دقيقة', en: 'min' };

/** "285.00 ج.م": two decimals, Latin digits. */
export function formatMoney(amount: number, locale: Locale = 'ar'): string {
  return `${amount.toFixed(2)} ${CURRENCY[locale]}`;
}

/** "300 ج.م": whole amounts without decimals, as in Tawsilty's offer text. Fractions keep two. */
export function formatAmount(amount: number, locale: Locale = 'ar'): string {
  return Number.isInteger(amount) ? `${amount} ${CURRENCY[locale]}` : formatMoney(amount, locale);
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits, as an Arabic keyboard types them, become 0-9. */
export const toLatinDigits = (input: string): string =>
  input.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));

/** Any way a customer types an Egyptian mobile number becomes the local 11-digit form "01xxxxxxxxx". */
export function normalizePhone(input: string): string {
  let digits = toLatinDigits(input).replace(/\D/g, '');
  if (digits.startsWith('0020')) digits = digits.slice(4);
  else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`;
  return digits;
}

/** Egyptian mobiles: 010, 011, 012 or 015, then 8 digits. */
export function isEgyptianMobile(input: string): boolean {
  return /^01[0125]\d{8}$/.test(normalizePhone(input));
}

/** Shown with the +2 country prefix: "+2 01554459196". */
export function formatPhone(input: string): string {
  return `+2 ${normalizePhone(input)}`;
}

/** Delivery time: "25 دقيقة". */
export function formatMinutes(minutes: number, locale: Locale = 'ar'): string {
  return `${minutes} ${MINUTES[locale]}`;
}

/** Pharmacy time range: "30 - 60 دقيقة". */
export function formatMinutesRange(from: number, to: number, locale: Locale = 'ar'): string {
  return `${from} - ${to} ${MINUTES[locale]}`;
}

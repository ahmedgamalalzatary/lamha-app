import { type CouponTerms, type DiscountRange, formatAmount, type Locale } from '@tawsela/shared';
import type { useT } from '@/core/i18n';

type T = ReturnType<typeof useT>;

/** "6 ج.م" or "20%". */
const off = (v: CouponTerms, locale: Locale) => (v.kind === 'percent' ? `${v.value}%` : formatAmount(v.value, locale));

/** The voucher's line: "خصم 6 ج.م على 150 ج.م", or "خصم 20%" with no minimum. */
export const voucherText = (t: T, v: CouponTerms & { minOrder: number }, locale: Locale) =>
  v.minOrder > 0
    ? t('offers.voucherText', { amount: off(v, locale), min: formatAmount(v.minOrder, locale) })
    : t('offers.voucherAny', { amount: off(v, locale) });

/** "خصم 30 ج.م على منتجات", or "خصم حتى 60 ج.م على منتجات" when the savings differ. */
export const discountText = (t: T, d: DiscountRange, locale: Locale) =>
  t(d.same ? 'offers.discount' : 'offers.discountUpTo', { amount: formatAmount(d.upTo, locale) });

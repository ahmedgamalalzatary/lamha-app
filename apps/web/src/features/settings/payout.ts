import type { PayoutOption } from '@tawsela/shared';

/** Who pays whom on a cash order (contract §8.7), in the words the dashboard shows. */
export const PAYOUT_LABELS: Record<PayoutOption, string> = {
  fee_only: 'المندوب يدفع للمتجر كامل قيمة المنتجات',
  app_share: 'المندوب يدفع للمتجر المنتجات بعد خصم نسبة التطبيق',
  nothing: 'المندوب لا يدفع للمتجر، والتطبيق يحاسب المتجر لاحقاً',
};

/** The same, short, for a table cell. */
export const PAYOUT_SHORT: Record<PayoutOption, string> = {
  fee_only: 'كامل المنتجات',
  app_share: 'بعد نسبة التطبيق',
  nothing: 'يحاسبه التطبيق',
};

/** Money with up to two decimals, at least 0 ("12", "12.5"). */
export const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

/** A percentage from 0 to 100 with up to two decimals. */
export const isPercent = (v: string) => isMoney(v) && Number(v) <= 100;

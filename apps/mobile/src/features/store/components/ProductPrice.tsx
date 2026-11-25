import { formatMoney, priceByChoice, type Product } from '@tawsela/shared';
import { AppText } from '@/components/AppText';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes } from '@/core/theme';

/** The price on a product, or "السعر حسب الاختيار" when a required choice sets it (§6.3). */
export function ProductPrice({ product }: { product: Product }) {
  const locale = useLocale();
  const t = useT();
  if (priceByChoice(product)) {
    return (
      <AppText color={colors.ink2} size={fontSizes.body}>
        {t('store.priceByChoice')}
      </AppText>
    );
  }
  return (
    <AppText weight="bold" size={fontSizes.listTitle}>
      {formatMoney(product.price, locale)}
    </AppText>
  );
}

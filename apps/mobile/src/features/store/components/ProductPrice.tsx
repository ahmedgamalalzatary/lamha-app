import { formatMoney, priceByChoice, type Product, productSaving } from '@tawsela/shared';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';

/**
 * The price on a product, or "السعر حسب الاختيار" when a required choice sets it (§6.3). A discounted
 * product shows its price in red with the old price struck through (§8.4 "العروض").
 */
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
  if (productSaving(product) > 0) {
    return (
      <View style={styles.row}>
        <AppText weight="bold" size={fontSizes.listTitle} color={colors.danger}>
          {formatMoney(product.price, locale)}
        </AppText>
        <AppText color={colors.ink2} size={fontSizes.body} style={styles.struck}>
          {formatMoney(product.oldPrice!, locale)}
        </AppText>
      </View>
    );
  }
  return (
    <AppText weight="bold" size={fontSizes.listTitle}>
      {formatMoney(product.price, locale)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  struck: { textDecorationLine: 'line-through' },
});

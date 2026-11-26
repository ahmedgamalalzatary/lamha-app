import { type StoreOffers, formatAmount } from '@tawsela/shared';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { discountText, voucherText } from '../offer-text';

/**
 * A store's offers under its row (contract §8.10, offers-screen-*): the lime product discount, the
 * green free-delivery amount, and the cream voucher with its purple "قسيمة" pill. Free delivery on
 * every order shows as the struck-through fee instead (StoreMeta).
 */
export function OfferBadges({ offers }: { offers: StoreOffers }) {
  const t = useT();
  const locale = useLocale();
  const free = offers.freeDeliveryFrom;
  if (!offers.discount && !offers.voucher && !free) return null;
  return (
    <View style={styles.list}>
      {offers.discount ? (
        <View style={[styles.badge, styles.lime]}>
          <AppText weight="bold" size={fontSizes.caption}>
            {discountText(t, offers.discount, locale)}
          </AppText>
        </View>
      ) : null}
      {free ? (
        <View style={[styles.badge, styles.green]}>
          <AppText weight="semibold" size={fontSizes.caption} color={colors.success}>
            {t('offers.freeFrom', { amount: formatAmount(free, locale) })}
          </AppText>
        </View>
      ) : null}
      {offers.voucher ? <VoucherBadge text={voucherText(t, offers.voucher, locale)} /> : null}
    </View>
  );
}

/** "قسيمة | خصم 6 ج.م على 150 ج.م". */
export function VoucherBadge({ text }: { text: string }) {
  const t = useT();
  return (
    <View style={[styles.badge, styles.voucher]}>
      <View style={styles.pill}>
        <AppText weight="bold" size={10} color={colors.bg}>
          {t('offers.voucher')}
        </AppText>
      </View>
      <AppText weight="bold" size={fontSizes.caption} color={colors.danger}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, alignItems: 'flex-start' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  lime: { backgroundColor: colors.lime },
  green: { backgroundColor: colors.success50, borderWidth: 1, borderColor: colors.success },
  voucher: { backgroundColor: colors.voucher50, borderWidth: 1, borderColor: colors.voucherLine },
  pill: { backgroundColor: colors.voucherPill, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 1 },
});

import { type CatalogStore, formatAmount, formatMinutes } from '@tawsela/shared';
import { Bike, Clock, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { FreeFee } from './FreeFee';


const Dot = () => <View style={styles.dot} />;

/** "★ 4.5 (2390) • 🕒 50 دقيقة • 🛵 24 ج.م", or "جديد" before the first rating (contract §8.3, §8.13). */
export function StoreMeta({ store, time = true }: { store: CatalogStore; time?: boolean }) {
  const locale = useLocale();
  const t = useT();
  return (
    <View style={styles.row}>
      <Star size={15} color={colors.star} fill={colors.star} />
      {store.rating === null ? (
        <AppText weight="bold" size={fontSizes.body}>
          {t('stores.new')}
        </AppText>
      ) : (
        <AppText size={fontSizes.body}>{`${store.rating.toFixed(1)} (${store.ratingCount})`}</AppText>
      )}
      {time ? (
        <>
          <Dot />
          <Clock size={15} color={colors.ink2} />
          <AppText color={colors.ink2} size={fontSizes.body}>
            {formatMinutes(store.deliveryMinutes, locale)}
          </AppText>
        </>
      ) : null}
      <Dot />
      <Bike size={15} color={colors.ink2} />
      {store.deliveryFee === 0 ? (
        <FreeFee />
      ) : (
        <AppText color={colors.ink2} size={fontSizes.body}>
          {formatAmount(store.deliveryFee, locale)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.line, marginHorizontal: 2 },
});

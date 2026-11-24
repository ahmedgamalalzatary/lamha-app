import { formatMoney, minimumOrderLeft } from '@tawsela/shared';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

/**
 * The store page's bottom bar (contract §8.4): "تسوّق الآن وأضف <minimum> أو أكثر إلى طلبك!" with a
 * lock, which turns into "عرض السلة · <count> · <total>" once something is in the cart.
 * [Open] A store with no minimum shows no bar until the cart has items.
 */
export function CartBar({ count, total, minimumOrder }: { count: number; total: number; minimumOrder: number }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const left = minimumOrderLeft(total, minimumOrder);
  if (!count && !left) return null;
  return (
    <View testID="cart-bar" style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}>
      {count ? (
        <PressableScale accessibilityRole="button" onPress={() => router.navigate('/customer/cart')} scaleTo={0.98} style={styles.cart}>
          <View style={styles.count}>
            <AppText weight="bold" color={colors.primary}>
              {count}
            </AppText>
          </View>
          <AppText weight="bold" size={fontSizes.listTitle} color={colors.bg}>
            {t('store.viewCart')}
          </AppText>
          <AppText weight="semibold" color={colors.bg}>
            {formatMoney(total)}
          </AppText>
        </PressableScale>
      ) : (
        <View style={styles.minimum}>
          <View style={styles.minimumRow}>
            <Lock size={18} color={colors.primary} />
            <AppText weight="semibold">{t('store.minimumOrder', { amount: formatMoney(left) })}</AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.progress, { width: `${Math.min(100, (total / minimumOrder) * 100)}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: 0, end: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  cart: {
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  count: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  minimum: { borderRadius: radius.lg, backgroundColor: colors.primary50, padding: spacing.lg, gap: spacing.md },
  minimumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.primary100, overflow: 'hidden' },
  progress: { height: 6, backgroundColor: colors.primary },
});

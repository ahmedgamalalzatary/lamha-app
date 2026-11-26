import { router } from 'expo-router';
import { ArrowRight, ChevronDown, ShoppingBag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { useDeliverTo } from '@/features/addresses/hooks/useDeliverTo';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

/**
 * A store list's top bar (contract §8.3): back, "التوصيل إلى <address>" (opens the saved addresses,
 * §8.9), the cart.
 */
export function StoresTopBar() {
  const t = useT();
  const deliverTo = useDeliverTo();
  return (
    <View style={styles.bar}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={8} scaleTo={0.9}>
        <DirectionalIcon icon={ArrowRight} size={26} color={colors.ink} />
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('home.deliverTo')} ${deliverTo.label}`}
        onPress={deliverTo.press}
        scaleTo={0.98}
        style={styles.address}
      >
        <AppText color={colors.ink2} size={fontSizes.caption}>
          {t('home.deliverTo')}
        </AppText>
        <View style={styles.addressRow}>
          <AppText weight="bold" size={fontSizes.listTitle} numberOfLines={1}>
            {deliverTo.label}
          </AppText>
          <ChevronDown size={16} color={colors.ink} />
        </View>
      </PressableScale>
      {deliverTo.sheet}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('tabs.cart')}
        onPress={() => router.navigate('/customer/cart')}
        scaleTo={0.9}
        style={styles.cart}
      >
        <ShoppingBag size={22} color={colors.ink} fill={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  address: { flex: 1, alignItems: 'flex-start' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cart: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
});

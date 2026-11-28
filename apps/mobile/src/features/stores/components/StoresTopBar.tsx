import { router } from 'expo-router';
import { ChevronDown, ShoppingBag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { useDeliverTo } from '@/features/addresses/hooks/useDeliverTo';
import { colors, fontSizes, sizes, spacing } from '@/core/theme';

/**
 * A store list's top bar (lamha's, contract §8.3): back, the list's title with "التوصيل إلى <address> ▾"
 * under it (opens the saved addresses, §8.9), and the cart.
 */
export function StoresTopBar({ title }: { title: string }) {
  const t = useT();
  const deliverTo = useDeliverTo();
  return (
    <View style={styles.bar}>
      <BackButton />
      <View style={styles.titles}>
        <AppText accessibilityRole="header" weight="semibold" size={fontSizes.topBar} numberOfLines={1}>
          {title}
        </AppText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${t('home.deliverTo')} ${deliverTo.label}`}
          onPress={deliverTo.press}
          scaleTo={0.98}
          style={styles.addressRow}
        >
          <AppText size={fontSizes.caption} color={colors.ink3} numberOfLines={1} style={styles.address}>
            {`${t('home.deliverTo')} ${deliverTo.label}`}
          </AppText>
          <ChevronDown size={14} color={colors.ink3} />
        </PressableScale>
      </View>
      {deliverTo.sheet}
      <PressableScale accessibilityRole="button" accessibilityLabel={t('tabs.cart')} onPress={() => router.navigate('/customer/cart')} scaleTo={0.9} style={styles.cart}>
        <ShoppingBag size={22} color={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.paper },
  titles: { flex: 1, minWidth: 0 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', maxWidth: '100%' },
  address: { flexShrink: 1 },
  cart: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, alignItems: 'center', justifyContent: 'center' },
});

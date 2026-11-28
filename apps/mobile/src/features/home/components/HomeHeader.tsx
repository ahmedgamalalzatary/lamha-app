import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronDown, Heart, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useDeliverTo } from '@/features/addresses/hooks/useDeliverTo';
import { useT } from '@/core/i18n';
import { colors, sizes, spacing } from '@/core/theme';
import { RotatingSearch } from './RotatingSearch';

/**
 * The home header (contract §8.2, lamha's): pen fading lighter downwards; "التوصيل إلى <address>", which
 * opens the saved addresses (§8.9), the heart for المفضلة, and the search box.
 */
export function HomeHeader() {
  const t = useT();
  const deliverTo = useDeliverTo();
  const insets = useSafeAreaInsets();
  const words = useMemo(() => t('home.searchWords').split('|'), [t]);
  return (
    <LinearGradient
      colors={[colors.headerFrom, colors.headerTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.top}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${t('home.deliverTo')} ${deliverTo.label}`}
          onPress={deliverTo.press}
          scaleTo={0.98}
          style={styles.addressRow}
        >
          <View style={styles.pin}>
            <MapPin size={20} color={colors.sheet} />
          </View>
          <AppText color={colors.sheet} size={14.5}>
            {t('home.deliverTo')}
          </AppText>
          <AppText weight="bold" color={colors.sheet} size={14.5} numberOfLines={1} style={styles.address}>
            {deliverTo.label}
          </AppText>
          <ChevronDown size={16} color={colors.sheet} />
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('favorites.title')} onPress={() => router.push('/favorites')} scaleTo={0.9} hitSlop={6} style={styles.heart}>
          <Heart size={22} color={colors.sheet} />
        </PressableScale>
      </View>
      <RotatingSearch words={words} onPress={() => router.push('/search')} />
      {deliverTo.sheet}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heart: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: { flexShrink: 1 },
});

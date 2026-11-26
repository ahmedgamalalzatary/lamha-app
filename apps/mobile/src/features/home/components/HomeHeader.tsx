import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useDeliverTo } from '@/features/addresses/components/useDeliverTo';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { RotatingSearch } from './RotatingSearch';

/**
 * The orange home header (contract §8.2): "التوصيل إلى <address>", which opens the saved addresses
 * (§8.9), and the search box.
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
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('home.deliverTo')} ${deliverTo.label}`}
        onPress={deliverTo.press}
        scaleTo={0.98}
        style={styles.addressRow}
      >
        <View style={styles.pin}>
          <MapPin size={18} color={colors.bg} fill="rgba(255,255,255,0.25)" />
        </View>
        <AppText color={colors.bg} size={fontSizes.listTitle}>
          {t('home.deliverTo')}
        </AppText>
        <AppText weight="bold" color={colors.bg} size={fontSizes.listTitle} numberOfLines={1} style={styles.address}>
          {deliverTo.label}
        </AppText>
        <ChevronDown size={18} color={colors.bg} />
      </PressableScale>
      <RotatingSearch words={words} onPress={() => router.push('/search')} />
      {deliverTo.sheet}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

import type { OfferKind } from '@tawsela/shared';
import { type Href, router } from 'expo-router';
import { Bike, type LucideIcon, Pizza, Ticket } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

const TILES: { kind: OfferKind; icon: LucideIcon }[] = [
  { kind: 'discounts', icon: Pizza },
  { kind: 'coupons', icon: Ticket },
  { kind: 'delivery', icon: Bike },
];

/**
 * "العروض والكوبونات" (customer/home/home-tiles-invite-50-offers-coupons-tiles): blue tiles عروض حصرية
 * لك · استخدم كوبون · عروض التوصيل, each opening the offers screen on its tab (§8.10).
 * [Derived] Tawsilty's tile art (pizza, tickets, scooter) is drawn here with icons.
 */
export function OfferTiles() {
  const t = useT();
  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.title}>
        {t('offers.section')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TILES.map(({ kind, icon: Icon }) => (
          <PressableScale
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={t(`offers.tile.${kind}`)}
            onPress={() => router.push(`/offers?kind=${kind}` as Href)}
            scaleTo={0.97}
            style={styles.tile}
          >
            <AppText weight="bold" size={fontSizes.sectionTitle + 2} color={colors.bg} style={styles.label}>
              {t(`offers.tile.${kind}`)}
            </AppText>
            <Icon size={64} color={colors.bg} strokeWidth={1.5} style={styles.art} />
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { paddingHorizontal: spacing.lg },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg },
  tile: { width: 150, height: 150, borderRadius: radius.lg + 8, backgroundColor: colors.blue, padding: spacing.lg, overflow: 'hidden' },
  label: { width: 110 },
  art: { position: 'absolute', bottom: spacing.md, end: spacing.md, opacity: 0.9 },
});

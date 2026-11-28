import type { OfferKind } from '@tawsela/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { type LucideIcon, Percent, Sparkles, Ticket, Truck } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Section } from '@/components/Section';
import { useT } from '@/core/i18n';
import { colors, spacing } from '@/core/theme';

const TILES: { kind: OfferKind; icon: LucideIcon; from: string; to: string }[] = [
  { kind: 'discounts', icon: Sparkles, from: colors.primary, to: colors.primary700 },
  { kind: 'coupons', icon: Ticket, from: colors.cocoa, to: colors.cocoa700 },
  { kind: 'delivery', icon: Truck, from: colors.success, to: colors.success700 },
];

/**
 * "العروض والكوبونات" (lamha's tiles): عروض حصرية لك · استخدم كوبون · عروض التوصيل on pen, cocoa and green
 * gradients with a faint icon and a % mark, each opening the offers screen on its tab (§8.10).
 */
export function OfferTiles() {
  const t = useT();
  return (
    <Section title={t('offers.section')} style={styles.section}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TILES.map(({ kind, icon: Icon, from, to }) => (
          <PressableScale
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={t(`offers.tile.${kind}`)}
            onPress={() => router.push(`/offers?kind=${kind}` as Href)}
          >
            <LinearGradient colors={[from, to]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.tile}>
              <AppText weight="bold" size={16} color={colors.sheet}>
                {t(`offers.tile.${kind}`)}
              </AppText>
              <Icon size={48} color={colors.sheet} strokeWidth={1.5} style={styles.icon} />
              <Percent size={64} color={colors.sheet} style={styles.percent} />
            </LinearGradient>
          </PressableScale>
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 0 },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  tile: { width: 132, height: 120, borderRadius: 18, padding: spacing.md, overflow: 'hidden' },
  icon: { position: 'absolute', bottom: spacing.sm, start: spacing.sm, opacity: 0.3 },
  percent: { position: 'absolute', bottom: -12, end: -12, opacity: 0.15 },
});

import { router } from 'expo-router';
import { ChevronLeft, type LucideIcon, Star, Wallet } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';

/**
 * "استخدم ووفر" (customer/home/home-use-and-save-points-wallet-banner-carousel.png): نقاطي and المحفظة,
 * each a white card with its orange icon and a chevron.
 */
export function UseAndSave() {
  const t = useT();
  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
        {t('home.useAndSave')}
      </AppText>
      <View style={styles.row}>
        <Shortcut icon={Star} label={t('points.title')} onPress={() => router.push('/points')} />
        <Shortcut icon={Wallet} label={t('home.wallet')} onPress={() => router.push('/wallet')} />
      </View>
    </View>
  );
}

function Shortcut({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.97} style={styles.card}>
      <View style={styles.icon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <AppText weight="semibold" size={fontSizes.listTitle + 1} style={styles.grow}>
        {label}
      </AppText>
      <View style={styles.chevron}>
        <DirectionalIcon icon={ChevronLeft} size={16} color={colors.ink2} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    padding: spacing.md,
  },
  icon: { width: sizes.icon, height: sizes.icon, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});

import { formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { ChevronLeft, type LucideIcon, Sparkles, Wallet } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, shadows, spacing } from '@/core/theme';
import { usePoints } from '@/features/points/api/points';
import { useWallet } from '@/features/wallet/api/wallet';

/**
 * نقاطي and المحفظة under the header (L1 #1, lamha's shortcuts): two white cards, each with a pale pen
 * icon tile, the name, what the customer has ("340 نقطة", "85 ج.م") and a chevron.
 */
export function UseAndSave() {
  const t = useT();
  const locale = useLocale();
  const points = usePoints();
  const wallet = useWallet();
  return (
    <View style={styles.row}>
      <Shortcut
        icon={Sparkles}
        label={t('points.title')}
        value={points.data ? t('points.count', { count: points.data.balance }) : ''}
        onPress={() => router.push('/points')}
      />
      <Shortcut
        icon={Wallet}
        label={t('home.wallet')}
        value={wallet.data ? formatMoney(wallet.data.balance, locale) : ''}
        onPress={() => router.push('/wallet')}
      />
    </View>
  );
}

function Shortcut({ icon: Icon, label, value, onPress }: { icon: LucideIcon; label: string; value: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={value ? `${label}، ${value}` : label} onPress={onPress} style={styles.card}>
      <View style={styles.icon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.grow}>
        <AppText weight="semibold" size={14.5} numberOfLines={1}>
          {label}
        </AppText>
        <AppText size={fontSizes.caption - 0.5} color={colors.ink3} numberOfLines={1}>
          {value}
        </AppText>
      </View>
      <DirectionalIcon icon={ChevronLeft} size={18} color={colors.ink3} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  grow: { flex: 1, minWidth: 0 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: colors.sheet, padding: 10, ...shadows.sheet },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});

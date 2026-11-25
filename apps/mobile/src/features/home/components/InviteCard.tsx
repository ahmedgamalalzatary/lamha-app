import { formatAmount, type InviteRewards } from '@tawsela/shared';
import { UserPlus, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

/**
 * Tawsilty's invite card (contract §8.2): "اربح 300 ج.م عن كل صديق — وصديقك يحصل على 25 ج.م فور
 * تسجيله", with ✕ to close it. The invite screen it opens arrives in Phase 19.
 */
export function InviteCard({ rewards, onClose }: { rewards: InviteRewards; onClose: () => void }) {
  const locale = useLocale();
  const t = useT();
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <UserPlus size={26} color={colors.bg} />
      </View>
      <View style={styles.text}>
        <AppText weight="bold" size={fontSizes.listTitle}>
          {t('home.inviteTitle', { amount: formatAmount(rewards.reward, locale) })}
        </AppText>
        <AppText color={colors.ink2} size={13}>
          {t('home.inviteText', { amount: formatAmount(rewards.friendReward, locale) })}
        </AppText>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('home.hideInvite')}
        onPress={onClose}
        hitSlop={12}
        scaleTo={0.85}
        style={styles.close}
      >
        <X size={18} color={colors.ink2} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary100,
    backgroundColor: colors.primary50,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xs },
  close: { alignSelf: 'flex-start' },
});

import { formatAmount, type InviteRewards } from '@tawsela/shared';
import { router } from 'expo-router';
import { UserPlus, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';

/**
 * The invite card (contract §8.2, lamha's look): "اربح 300 ج.م عن كل صديق — وصديقك يحصل على 25 ج.م فور
 * تسجيله", with ✕ to close it. Tapping it opens ادعُ أصدقاءك (Phase 19).
 */
export function InviteCard({ rewards, onClose }: { rewards: InviteRewards; onClose: () => void }) {
  const locale = useLocale();
  const t = useT();
  return (
    <View style={styles.card}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('invite.title')} onPress={() => router.push('/invite')} scaleTo={0.98} style={styles.open}>
        <View style={styles.icon}>
          <UserPlus size={24} color={colors.sheet} />
        </View>
        <View style={styles.text}>
          <AppText weight="bold" size={15.5}>
            {t('home.inviteTitle', { amount: formatAmount(rewards.reward, locale) })}
          </AppText>
          <AppText color={colors.ink2} size={fontSizes.caption}>
            {t('home.inviteText', { amount: formatAmount(rewards.friendReward, locale) })}
          </AppText>
        </View>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('home.hideInvite')}
        onPress={onClose}
        hitSlop={12}
        scaleTo={0.85}
        style={styles.close}
      >
        <X size={16} color={colors.ink3} />
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
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary100,
    backgroundColor: colors.primary50,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { alignSelf: 'flex-start' },
});

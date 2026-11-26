import { formatAmount } from '@tawsela/shared';
import { router } from 'expo-router';
import { ChevronLeft, Copy, Gift, Share2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { inviteActions, useInvite } from './api';

const GLASS = 'rgba(255,255,255,0.22)';

/**
 * حسابي's invite card (customer/account/account-top-wallet-points-invite-50.jpg): "اربح <n> عن كل
 * صديق", the friend's reward, رمزك with copy, and مشاركة; the top opens ادعُ أصدقاءك.
 */
export function AccountInviteCard() {
  const t = useT();
  const locale = useLocale();
  const invite = useInvite();
  if (!invite.data) return null;
  const { code, settings } = invite.data;
  return (
    <View style={styles.card}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('invite.title')} onPress={() => router.push('/invite')} scaleTo={0.98} style={styles.top}>
        <View style={styles.gift}>
          <Gift size={24} color={colors.bg} />
        </View>
        <View style={styles.grow}>
          <AppText weight="bold" size={fontSizes.listTitle + 2} color={colors.bg}>
            {t('home.inviteTitle', { amount: formatAmount(settings.reward, locale) })}
          </AppText>
          <AppText size={13} color={colors.bg}>
            {t('home.inviteText', { amount: formatAmount(settings.friendReward, locale) })}
          </AppText>
        </View>
        <DirectionalIcon icon={ChevronLeft} size={22} color={colors.bg} />
      </PressableScale>
      <View style={styles.bottom}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('invite.copy')} onPress={() => void inviteActions.copy(t, code)} style={styles.codeBox}>
          <AppText size={13} color={colors.bg}>
            {t('invite.yourCode')}
          </AppText>
          <AppText weight="bold" size={fontSizes.listTitle + 2} color={colors.bg} style={styles.code}>
            {code}
          </AppText>
          <Copy size={18} color={colors.bg} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('invite.share')}
          onPress={() => void inviteActions.share(t, code, settings.friendReward, locale)}
          style={styles.share}
        >
          <Share2 size={18} color={colors.primary} />
          <AppText weight="bold" color={colors.primary}>
            {t('invite.share')}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  card: { borderRadius: 24, backgroundColor: colors.primary700, padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gift: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', gap: spacing.md },
  codeBox: { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: GLASS, backgroundColor: GLASS, paddingHorizontal: spacing.md, minHeight: 52 },
  code: { flex: 1, textAlign: 'center', letterSpacing: 3 },
  share: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.bg, minHeight: 52 },
});

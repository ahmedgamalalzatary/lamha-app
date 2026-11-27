import { formatAmount, type InvitedFriend, type InviteOverview } from '@tawsela/shared';
import { router } from 'expo-router';
import { ChevronLeft, Copy, Gift, MessageSquareText, Share2, UserPlus } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT, useTextStart } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { inviteActions, useInvite } from '../api/invite';


/**
 * ادعُ أصدقاءك (contract §8.17; customer/account/invite-friends-code-share.png and
 * invite-friends-how-it-works-rules.png): the orange card with the reward, رمز دعوتك with نسخ, واتساب
 * and مشاركة; ربحت and رصيدك المتاح; "كيف تعمل الدعوة؟" with the admin's rules; and the friends who joined.
 * [Open] The friends' rows are not captured.
 */
export function InviteScreen() {
  const t = useT();
  const invite = useInvite();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('invite.title')}
        </AppText>
        <View style={styles.side} />
      </View>
      {invite.data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={invite.isRefetching} onRefresh={() => void invite.refetch()} />}
        >
          <Body data={invite.data} />
        </ScrollView>
      ) : invite.isError ? (
        <View style={styles.content}>
          <AppText color={colors.danger}>{errorMessage(invite.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void invite.refetch()} />
        </View>
      ) : (
        <View style={styles.content}>
          <Skeleton style={styles.cardSkeleton} />
          <Skeleton style={styles.rowSkeleton} />
        </View>
      )}
    </SafeAreaView>
  );
}

function Body({ data }: { data: InviteOverview }) {
  const t = useT();
  const locale = useLocale();
  const textStart = useTextStart();
  const s = data.settings;
  const money = (n: number) => formatAmount(n, locale);
  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.giftTile}>
            <Gift size={28} color={colors.bg} />
          </View>
          <View style={styles.grow}>
            <AppText weight="bold" size={fontSizes.sectionTitle + 2} color={colors.bg}>
              {t('invite.headline', { amount: money(s.reward) })}
            </AppText>
            <AppText color={colors.bg}>{t('invite.friendGets', { amount: money(s.friendReward) })}</AppText>
          </View>
        </View>
        <AppText color={colors.bg} style={{ textAlign: textStart }}>
          {t('invite.codeLabel')}
        </AppText>
        <View style={styles.codeBox}>
          <AppText weight="bold" size={22} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.code}>
            {data.code}
          </AppText>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('invite.copy')} onPress={() => void inviteActions.copy(t, data.code)} hitSlop={8} style={styles.copy}>
            <Copy size={18} color={colors.primary} />
            <AppText weight="semibold" color={colors.primary}>
              {t('invite.copy')}
            </AppText>
          </PressableScale>
        </View>
        <View style={styles.actions}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('invite.whatsapp')}
            onPress={() => void inviteActions.whatsapp(t, data.code, s.friendReward, locale)}
            style={[styles.action, styles.actionWhite]}
          >
            <MessageSquareText size={20} color={colors.primary} />
            <AppText weight="bold" color={colors.primary}>
              {t('invite.whatsapp')}
            </AppText>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('invite.share')}
            onPress={() => void inviteActions.share(t, data.code, s.friendReward, locale)}
            style={[styles.action, styles.actionGlass]}
          >
            <Share2 size={20} color={colors.bg} />
            <AppText weight="bold" color={colors.bg}>
              {t('invite.share')}
            </AppText>
          </PressableScale>
        </View>
      </View>

      <View style={[styles.panel, styles.stats]}>
        <View accessible accessibilityLabel={`${t('invite.earned')} ${money(data.earned)}`} style={styles.stat}>
          <AppText weight="bold" size={fontSizes.sectionTitle + 2} color={colors.success}>
            {money(data.earned)}
          </AppText>
          <AppText color={colors.ink2}>{t('invite.earned')}</AppText>
        </View>
        <View style={styles.divider} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${t('invite.available')} ${money(data.available)}`}
          onPress={() => router.push('/wallet')}
          style={[styles.stat, styles.statLink]}
        >
          <View style={styles.grow}>
            <AppText weight="bold" size={fontSizes.sectionTitle + 2} style={styles.centred}>
              {money(data.available)}
            </AppText>
            <AppText color={colors.ink2} style={styles.centred}>
              {t('invite.available')}
            </AppText>
          </View>
          <DirectionalIcon icon={ChevronLeft} size={20} color={colors.ink2} />
        </PressableScale>
      </View>

      <View style={styles.panel}>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('invite.how')}
        </AppText>
        <Step n={1} title={t('invite.step1')} body={[t('invite.step1Body')]} />
        <Step n={2} title={t('invite.step2')} body={[t('invite.step2Body')]} />
        <Step
          n={3}
          title={t('invite.step3')}
          body={[
            t('invite.step3Body'),
            s.expires
              ? t('invite.ruleReward', { amount: money(s.reward), perOrder: money(s.rewardPerOrder), days: s.rewardDays })
              : t('invite.ruleRewardForever', { amount: money(s.reward), perOrder: money(s.rewardPerOrder) }),
            s.expires ? t('invite.ruleFriend', { amount: money(s.friendReward), days: s.friendDays }) : t('invite.ruleFriendForever', { amount: money(s.friendReward) }),
            t('invite.ruleFirstOrder', { days: s.firstOrderDays }),
            t('invite.ruleWhere'),
          ]}
        />
        <AppText color={colors.ink2}>{t('invite.leftThisMonth', { count: data.leftThisMonth })}</AppText>
      </View>

      <View style={styles.panel}>
        {data.friends.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <UserPlus size={28} color={colors.primary} />
            </View>
            <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle + 2}>
              {t('invite.noFriends')}
            </AppText>
            <AppText color={colors.ink2} style={styles.centred}>
              {t('invite.noFriendsBody')}
            </AppText>
          </View>
        ) : (
          data.friends.map((f, i) => <Friend key={`${f.joinedAt}-${i}`} friend={f} />)
        )}
      </View>
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string[] }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <AppText weight="semibold" color={colors.primary}>
          {n}
        </AppText>
      </View>
      <View style={styles.grow}>
        <AppText weight="bold" size={fontSizes.listTitle + 1}>
          {title}
        </AppText>
        {body.map((line) => (
          <AppText key={line} color={colors.ink2}>
            {line}
          </AppText>
        ))}
      </View>
    </View>
  );
}

/** [Open] A friend's row: the first name and what they brought, or that their first order is awaited. */
function Friend({ friend: f }: { friend: InvitedFriend }) {
  const t = useT();
  const locale = useLocale();
  const status =
    f.status === 'rewarded' && f.reward > 0
      ? t('invite.friendRewarded', { amount: formatAmount(f.reward, locale) })
      : f.status === 'waiting'
        ? t('invite.friendWaiting')
        : t('invite.friendMissed');
  return (
    <View accessible accessibilityLabel={`${f.name}، ${status}`} style={styles.friend}>
      <View style={styles.friendIcon}>
        <UserPlus size={18} color={colors.primary} />
      </View>
      <AppText weight="semibold" style={styles.grow}>
        {f.name}
      </AppText>
      <AppText color={f.status === 'rewarded' && f.reward > 0 ? colors.success : colors.ink2}>{status}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  grow: { flex: 1 },
  centred: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  side: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
  cardSkeleton: { height: 320, borderRadius: radius.xl },
  rowSkeleton: { height: 100, borderRadius: radius.lg },
  card: { borderRadius: radius.xl, backgroundColor: colors.primary, padding: spacing.xl, gap: spacing.lg },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  giftTile: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.lg, minHeight: 64 },
  code: { flex: 1, letterSpacing: 4 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 56, borderRadius: radius.lg },
  actionWhite: { backgroundColor: colors.bg },
  actionGlass: { backgroundColor: colors.glass },
  panel: { backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.lg },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statLink: { flexDirection: 'row' },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
  step: { flexDirection: 'row', gap: spacing.md },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  friend: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  friendIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});

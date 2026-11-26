import { formatMoney, type MyPoints, type PointsEntry, pointsToGo, type WalletKind } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Gift, LockKeyhole, ShoppingBag, Star, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useAgo } from '@/features/partner/parts';
import { usePoints } from './api';


/**
 * نقاطي (contract §8.16, customer/account/points-balance-progress.png): the orange card with رصيد
 * النقاط, the bar to the minimum and "باقي <n> نقطة للاستبدال", قيمة نقاطك and الحد الأدنى للاستبدال;
 * the tabs المكتسبة / المنفقة. [Open] المنفقة's empty state and the rows are not captured.
 */
export function PointsScreen() {
  const t = useT();
  const points = usePoints();
  const [tab, setTab] = useState<WalletKind>('add');
  const entries = points.data?.entries.filter((e) => e.kind === tab) ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.side} />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('points.title')}
        </AppText>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ArrowRight} size={24} color={colors.ink} />
        </PressableScale>
      </View>

      {points.data ? <Card data={points.data} /> : <Skeleton style={styles.cardSkeleton} />}

      <View accessibilityRole="tablist" style={styles.tabs}>
        <Tab label={t('points.earned')} selected={tab === 'add'} onPress={() => setTab('add')} />
        <Tab label={t('points.spent')} selected={tab === 'deduct'} onPress={() => setTab('deduct')} />
      </View>

      {points.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : points.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(points.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void points.refetch()} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <ShoppingBag size={30} color={colors.primary} />
          </View>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
            {t(tab === 'add' ? 'points.noEarned' : 'points.noSpent')}
          </AppText>
          <AppText color={colors.ink2}>{t(tab === 'add' ? 'points.noEarnedBody' : 'points.noSpentBody')}</AppText>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={points.isRefetching} onRefresh={() => void points.refetch()} />}
          renderItem={({ item }) => <Row entry={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Card({ data }: { data: MyPoints }) {
  const t = useT();
  const locale = useLocale();
  const toGo = pointsToGo(data.balance, data.minimum);
  const filled = data.minimum > 0 ? Math.min(1, data.balance / data.minimum) : 1;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.starCircle}>
          <Star size={20} color={colors.bg} fill={colors.bg} />
        </View>
        <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.bg}>
          {t('points.balance')}
        </AppText>
      </View>
      <View accessible accessibilityLabel={t('points.count', { count: data.balance })} style={styles.balance}>
        <AppText weight="bold" size={44} color={colors.bg}>
          {data.balance}
        </AppText>
        <AppText size={fontSizes.listTitle + 1} color={colors.bg}>
          {t('points.unit')}
        </AppText>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: data.minimum, now: Math.min(data.balance, data.minimum) }} style={styles.track}>
        <View style={[styles.fill, { width: `${filled * 100}%` }]} />
      </View>
      <View style={styles.cardTop}>
        <LockKeyhole size={16} color={colors.bg} />
        <AppText color={colors.bg}>{toGo > 0 ? t('points.toGo', { count: toGo }) : t('points.ready')}</AppText>
      </View>
      <View style={styles.inner}>
        <View style={styles.half}>
          <View style={styles.cardTop}>
            <Wallet size={16} color={colors.bg} />
            <AppText color={colors.bg}>{t('points.worth')}</AppText>
          </View>
          <AppText weight="bold" size={fontSizes.listTitle + 2} color={colors.bg}>
            {formatMoney(data.worth, locale)}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.half}>
          <View style={styles.cardTop}>
            <Gift size={16} color={colors.bg} />
            <AppText color={colors.bg}>{t('points.minimum')}</AppText>
          </View>
          <AppText weight="bold" size={fontSizes.listTitle + 2} color={colors.bg}>
            {t('points.count', { count: data.minimum })}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} scaleTo={1} style={styles.tab}>
      <AppText weight={selected ? 'bold' : 'regular'} size={fontSizes.listTitle + 1} color={selected ? colors.ink : colors.ink2}>
        {label}
      </AppText>
      <View style={[styles.tabLine, selected && styles.tabLineOn]} />
    </PressableScale>
  );
}

/** The reason, how long ago, and the points: green "+" earned, red "-" spent [Open]. */
function Row({ entry: e }: { entry: PointsEntry }) {
  const t = useT();
  const ago = useAgo();
  const add = e.kind === 'add';
  const code = e.orderCode;
  const title =
    e.reason === 'order' && code
      ? t(add ? 'points.earnedOrder' : 'points.spentOrder', { code })
      : e.reason === 'refund' && code
        ? t('points.refund', { code })
        : e.note;
  const amount = `${add ? '+' : '-'}${t('points.count', { count: e.points })}`;
  const Icon = add ? ArrowDownLeft : ArrowUpRight;
  return (
    <View accessible accessibilityLabel={`${title}، ${amount}`} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: add ? colors.success50 : colors.danger50 }]}>
        <Icon size={20} color={add ? colors.success : colors.danger} />
      </View>
      <View style={styles.grow}>
        <AppText weight="semibold">{title}</AppText>
        <AppText size={fontSizes.caption} color={colors.ink2}>
          {ago(e.createdAt)}
        </AppText>
      </View>
      <AppText weight="bold" color={add ? colors.success : colors.danger}>
        {amount}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  side: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cardSkeleton: { height: 300, margin: spacing.lg, borderRadius: 24 },
  card: { margin: spacing.lg, borderRadius: 24, backgroundColor: colors.primary, padding: spacing.xl, gap: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  starCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
  balance: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.glass, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.bg },
  inner: { flexDirection: 'row', borderRadius: radius.lg, backgroundColor: colors.glass, padding: spacing.lg },
  half: { flex: 1, alignItems: 'center', gap: spacing.sm },
  divider: { width: 1, backgroundColor: colors.glass },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingTop: spacing.md, gap: spacing.md },
  tabLine: { height: 3, width: '60%', borderRadius: 2, backgroundColor: 'transparent' },
  tabLineOn: { backgroundColor: colors.primary },
  list: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 64, borderRadius: radius.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});

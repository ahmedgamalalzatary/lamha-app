import { formatMoney, type WalletEntry, type WalletKind } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT, useTextStart } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useAgo } from '@/features/partner/parts';
import { useWallet } from './api';

/** The pale page and the red tile of "لا توجد خصومات", as captured. */
const PAGE = '#F5F6FA';
const DANGER_50 = '#FDEDED';

/**
 * حركة المحفظة (contract §8.15; customer/account/wallet-balance-card.png, wallet-additions-empty.png,
 * wallet-deductions-empty.png): the white header, the orange "رصيد المحفظة" card, and the tabs
 * الإضافات / الخصومات with their empty states. "شحن المحفظة" is not shown: top-up is excluded for now
 * [Owner, 2026-11-23]. [Open] The rows are not captured: the reason, when, and the amount in green or red.
 */
export function WalletScreen() {
  const t = useT();
  const locale = useLocale();
  const textStart = useTextStart();
  const wallet = useWallet();
  const [tab, setTab] = useState<WalletKind>('add');
  const entries = wallet.data?.entries.filter((e) => e.kind === tab) ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.side} />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('wallet.title')}
        </AppText>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ChevronRight} size={26} color={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.card}>
        <AppText color={colors.bg} style={{ textAlign: textStart }}>
          {t('wallet.balance')}
        </AppText>
        {wallet.data ? (
          <AppText weight="bold" size={36} color={colors.bg} style={{ textAlign: textStart }}>
            {formatMoney(wallet.data.balance, locale)}
          </AppText>
        ) : (
          <Skeleton style={styles.balanceSkeleton} />
        )}
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        <Tab label={t('wallet.additions')} selected={tab === 'add'} onPress={() => setTab('add')} />
        <Tab label={t('wallet.deductions')} selected={tab === 'deduct'} onPress={() => setTab('deduct')} />
      </View>

      {wallet.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : wallet.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(wallet.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void wallet.refetch()} />
        </View>
      ) : entries.length === 0 ? (
        tab === 'add' ? (
          <Empty icon={ArrowDownLeft} color={colors.success} tile={colors.success50} title={t('wallet.noAdditions')} message={t('wallet.noAdditionsBody')} />
        ) : (
          <Empty icon={ArrowUpRight} color={colors.danger} tile={DANGER_50} title={t('wallet.noDeductions')} message={t('wallet.noDeductionsBody')} />
        )
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={wallet.isRefetching} onRefresh={() => void wallet.refetch()} />}
          renderItem={({ item }) => <Row entry={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} scaleTo={1} style={[styles.tab, selected && styles.tabOn]}>
      <AppText weight={selected ? 'bold' : 'regular'} color={selected ? colors.primary : colors.ink2}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function Empty({ icon: Icon, color, tile, title, message }: { icon: LucideIcon; color: string; tile: string; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyTile, { backgroundColor: tile }]}>
        <Icon size={30} color={color} />
      </View>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
        {title}
      </AppText>
      <AppText color={colors.ink2}>{message}</AppText>
    </View>
  );
}

/** The reason, how long ago, and the amount: green "+" for an addition, red "-" for a deduction [Open]. */
function Row({ entry: e }: { entry: WalletEntry }) {
  const t = useT();
  const locale = useLocale();
  const ago = useAgo();
  const add = e.kind === 'add';
  const title =
    e.reason === 'order' && e.orderCode ? t('wallet.paidOrder', { code: e.orderCode }) : e.reason === 'refund' && e.orderCode ? t('wallet.refund', { code: e.orderCode }) : e.note;
  const amount = `${add ? '+' : '-'}${formatMoney(e.amount, locale)}`;
  const Icon = add ? ArrowDownLeft : ArrowUpRight;
  return (
    <View accessible accessibilityLabel={`${title}، ${amount}`} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: add ? colors.success50 : DANGER_50 }]}>
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
  screen: { flex: 1, backgroundColor: PAGE },
  grow: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  side: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  card: {
    margin: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  balanceSkeleton: { height: 40, width: 140, borderRadius: radius.md },
  tabs: { flexDirection: 'row', backgroundColor: colors.bg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 3, borderColor: 'transparent' },
  tabOn: { borderColor: colors.primary },
  list: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 64, borderRadius: radius.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTile: { width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});

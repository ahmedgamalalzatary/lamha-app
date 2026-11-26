import { type DriverFine, formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowRight, BadgeMinus, Wallet } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useAgo } from '@/features/partner/parts';
import { useDriverMoney } from './api';

/**
 * فواتيري (the tile on حسابي, driver/driver-account-invoices-points-shifts-history.jpg) [Open: the
 * screen behind it is not captured]. Owner's answer (2026-11-26): his net earnings, so the card adds
 * his delivery earnings and speed points cash and takes off the fines, and below it
 * الخصومات والغرامات lists every fine with its amount, reason, date and order (§10).
 */
export function DriverMoneyScreen() {
  const t = useT();
  const money = useDriverMoney();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ArrowRight} size={24} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('driver.money')}
        </AppText>
        <View style={styles.side} />
      </View>
      {money.isPending ? (
        <View style={styles.list}>
          <Skeleton style={styles.cardSkeleton} />
        </View>
      ) : money.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(money.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void money.refetch()} />
        </View>
      ) : (
        <FlatList
          data={money.data.list}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={money.isRefetching} onRefresh={() => void money.refetch()} />}
          ListHeaderComponent={
            <View style={styles.top}>
              <Summary net={money.data.net} earnings={money.data.earnings} pointsCash={money.data.pointsCash} fines={money.data.fines} />
              <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
                {t('driver.fines')}
              </AppText>
            </View>
          }
          ListEmptyComponent={<AppText color={colors.ink2}>{t('driver.noFines')}</AppText>}
          renderItem={({ item }) => <FineRow fine={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Summary({ net, earnings, pointsCash, fines }: { net: number; earnings: number; pointsCash: number; fines: number }) {
  const t = useT();
  const locale = useLocale();
  const line = (label: string, amount: string, color: string = colors.ink) => (
    <View accessible style={styles.line}>
      <AppText style={styles.grow}>{label}</AppText>
      <AppText weight="semibold" color={color}>
        {amount}
      </AppText>
    </View>
  );
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Wallet size={24} color={colors.blue} />
        <AppText weight="semibold" size={fontSizes.listTitle + 1}>
          {t('driver.net')}
        </AppText>
      </View>
      <AppText accessibilityLabel={`${t('driver.net')} ${formatMoney(net, locale)}`} weight="bold" size={32} color={colors.success}>
        {formatMoney(net, locale)}
      </AppText>
      {line(t('driver.earnings'), formatMoney(earnings, locale))}
      {line(t('driver.pointsCash'), formatMoney(pointsCash, locale))}
      {line(t('driver.finesTotal'), `- ${formatMoney(fines, locale)}`, colors.danger)}
    </View>
  );
}

function FineRow({ fine: f }: { fine: DriverFine }) {
  const t = useT();
  const locale = useLocale();
  const ago = useAgo();
  const amount = `- ${formatMoney(f.amount, locale)}`;
  return (
    <View accessible accessibilityLabel={`${f.reason}، ${amount}`} style={styles.row}>
      <View style={styles.rowIcon}>
        <BadgeMinus size={20} color={colors.danger} />
      </View>
      <View style={styles.grow}>
        <AppText weight="semibold">{f.reason}</AppText>
        <AppText size={fontSizes.caption} color={colors.ink2}>
          {f.order ? `${t('driver.historyOrder', { code: f.order.code })} · ${ago(f.createdAt)}` : ago(f.createdAt)}
        </AppText>
      </View>
      <AppText weight="bold" color={colors.danger}>
        {amount}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  side: { width: sizes.icon, height: sizes.icon, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  top: { gap: spacing.lg, marginBottom: spacing.xs },
  cardSkeleton: { height: 220, borderRadius: radius.lg },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md },
  rowIcon: { width: sizes.icon, height: sizes.icon, borderRadius: sizes.icon / 2, backgroundColor: colors.danger50, alignItems: 'center', justifyContent: 'center' },
});

import { type DriverPointsEntry, formatMoney } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowRight, Banknote, Gauge, Star } from 'lucide-react-native';
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
import { useDriverPoints } from './api';

/**
 * The delivery man's نقاطي (the tile on حسابي) [Open: the screen behind it is not captured]: speed
 * points (§10) not yet paid out and their value, the admin's levels, and his points and payouts.
 * Owner's answer (2026-11-26): the admin pays the balance in cash, which starts it again.
 */
export function DriverPointsScreen() {
  const t = useT();
  const locale = useLocale();
  const points = useDriverPoints();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ArrowRight} size={24} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 1}>
          {t('points.title')}
        </AppText>
        <View style={styles.side} />
      </View>
      {points.isPending ? (
        <View style={styles.list}>
          <Skeleton style={styles.cardSkeleton} />
        </View>
      ) : points.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(points.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void points.refetch()} />
        </View>
      ) : (
        <FlatList
          data={points.data.entries}
          keyExtractor={(e, i) => `${e.kind}-${e.order?.id ?? i}-${e.createdAt}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={points.isRefetching} onRefresh={() => void points.refetch()} />}
          ListHeaderComponent={
            <View style={styles.top}>
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.starCircle}>
                    <Star size={20} color={colors.bg} fill={colors.bg} />
                  </View>
                  <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.bg}>
                    {t('driver.speedBalance')}
                  </AppText>
                </View>
                <AppText accessibilityLabel={t('points.count', { count: points.data.balance })} weight="bold" size={44} color={colors.bg}>
                  {points.data.balance}
                </AppText>
                <AppText color={colors.bg}>{t('driver.speedWorth', { amount: formatMoney(points.data.value, locale) })}</AppText>
                <AppText size={fontSizes.caption} color={colors.bg}>
                  {t('driver.speedPaidInCash')}
                </AppText>
              </View>
              {points.data.levels.length ? (
                <View style={styles.levels}>
                  <AppText accessibilityRole="header" weight="bold">
                    {t('driver.speedLevels')}
                  </AppText>
                  {[...points.data.levels]
                    .sort((a, b) => a.maxMinutesPerKm - b.maxMinutesPerKm)
                    .map((l) => (
                      <View key={l.maxMinutesPerKm} accessible style={styles.level}>
                        <Gauge size={18} color={colors.primary} />
                        <AppText style={styles.grow}>{t('driver.speedLevel', { minutes: String(l.maxMinutesPerKm) })}</AppText>
                        <AppText weight="semibold">{t('points.count', { count: l.points })}</AppText>
                      </View>
                    ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={<AppText color={colors.ink2}>{t('driver.noSpeedPoints')}</AppText>}
          renderItem={({ item }) => <Row entry={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ entry: e }: { entry: DriverPointsEntry }) {
  const t = useT();
  const locale = useLocale();
  const ago = useAgo();
  const earned = e.kind === 'order';
  const title = earned && e.order ? t('driver.speedOrder', { code: e.order.code }) : t('driver.speedPayout', { amount: formatMoney(e.value ?? 0, locale) });
  const amount = `${earned ? '+' : '-'}${t('points.count', { count: e.points })}`;
  return (
    <View accessible accessibilityLabel={`${title}، ${amount}`} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: earned ? colors.success50 : colors.primary50 }]}>
        {earned ? <Gauge size={20} color={colors.success} /> : <Banknote size={20} color={colors.primary} />}
      </View>
      <View style={styles.grow}>
        <AppText weight="semibold">{title}</AppText>
        <AppText size={fontSizes.caption} color={colors.ink2}>
          {e.minutesPerKm !== null ? `${t('driver.speedOf', { minutes: String(e.minutesPerKm) })} · ${ago(e.createdAt)}` : ago(e.createdAt)}
        </AppText>
      </View>
      <AppText weight="bold" color={earned ? colors.success : colors.primary}>
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
  list: { padding: spacing.lg, gap: spacing.md },
  top: { gap: spacing.lg, marginBottom: spacing.xs },
  cardSkeleton: { height: 220, borderRadius: 24 },
  card: { borderRadius: 24, backgroundColor: colors.primary, padding: spacing.xl, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  starCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
  levels: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  level: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

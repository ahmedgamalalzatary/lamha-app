import type { DriverShiftState } from '@tawsela/shared';
import { Ban, Clock, ReceiptText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useDriverOffers, useDriverShift, useShiftAction } from './api';
import { cairoTime, cardShadow, OfferCard, useNow } from './parts';

/**
 * الرئيسية of the delivery man (contract §10). [Open] Tawsilty's driver home is not captured
 * (§15.1 #9): the status pill and the "نوبة عمل محجوزة" card follow the client's reference from
 * another app (client-driver-shift-reserved-start-reference-other-app.jpg); the offers use the
 * store's card look.
 */
export function DriverHomeScreen() {
  const t = useT();
  const shift = useDriverShift();
  const offers = useDriverOffers();
  const on = shift.data?.status === 'on';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View accessible accessibilityLabel={`${t('driver.status')}: ${t(on ? 'driver.working' : 'driver.notWorking')}`} style={styles.status}>
          <View style={[styles.dot, { backgroundColor: on ? colors.success : colors.ink2 }]} />
          <AppText size={fontSizes.caption} color={colors.ink2}>
            {t('driver.status')}
          </AppText>
          <AppText weight="bold">{t(on ? 'driver.working' : 'driver.notWorking')}</AppText>
        </View>
      </View>
      {shift.isPending ? (
        <View style={styles.list}>
          <Skeleton style={styles.skeleton} />
        </View>
      ) : shift.isError ? (
        <View style={styles.center}>
          <AppText color={colors.danger}>{errorMessage(shift.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void shift.refetch()} />
        </View>
      ) : (
        <FlatList
          data={on && !shift.data.blockedUntil ? (offers.data ?? []) : []}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={shift.isRefetching || offers.isRefetching}
              onRefresh={() => {
                void shift.refetch();
                void offers.refetch();
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.top}>
              <ShiftCard state={shift.data} />
              {shift.data.blockedUntil ? (
                <View accessibilityRole="alert" style={styles.blocked}>
                  <Ban size={20} color={colors.danger} />
                  <AppText color={colors.danger} style={styles.grow}>
                    {t('driver.blocked', { time: cairoTime(shift.data.blockedUntil) })}
                  </AppText>
                </View>
              ) : null}
              <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle}>
                {t('driver.newOrders')}
              </AppText>
            </View>
          }
          ListEmptyComponent={<EmptyState icon={ReceiptText} title={t('driver.noOffers')} message={on ? undefined : t('driver.offShiftNote')} />}
          renderItem={({ item }) => <OfferCard offer={item} />}
        />
      )}
    </SafeAreaView>
  );
}

/** "نوبة عمل محجوزة" before it, "نوبة العمل الحالية" during it, with start, extend and end. */
function ShiftCard({ state }: { state: DriverShiftState }) {
  const t = useT();
  const act = useShiftAction();
  const now = useNow(true, 30_000);
  const [ending, setEnding] = useState(false);
  const run = (action: 'start' | 'extend' | 'end') => act.mutate(action, { onError: (e) => toast.show(errorMessage(e), 'error') });

  if (state.status === 'on' && state.endsAt) {
    return (
      <View style={styles.card}>
        <AppText weight="bold" size={fontSizes.sectionTitle - 1}>
          {t('driver.currentShift')}
        </AppText>
        <View style={styles.row}>
          <Clock size={18} color={colors.ink2} />
          <AppText>{t('driver.endsAt', { time: cairoTime(state.endsAt) })}</AppText>
        </View>
        {state.extensionsLeft > 0 ? (
          <>
            <Button label={t('driver.extend', { minutes: state.extendMinutes })} variant="soft" loading={act.isPending && act.variables === 'extend'} onPress={() => run('extend')} />
            <AppText size={fontSizes.caption} color={colors.ink2}>
              {t('driver.extensionsLeft', { count: state.extensionsLeft })}
            </AppText>
          </>
        ) : null}
        <Button label={t('driver.end')} variant="danger" onPress={() => setEnding(true)} />
        <ConfirmDialog
          visible={ending}
          title={t('driver.end')}
          message={t('driver.endBody')}
          confirmLabel={t('driver.end')}
          onConfirm={() => {
            setEnding(false);
            run('end');
          }}
          onCancel={() => setEnding(false)}
        />
      </View>
    );
  }

  if (!state.shift) {
    return (
      <View style={styles.card}>
        <AppText weight="bold" size={fontSizes.sectionTitle - 1}>
          {t('driver.noShift')}
        </AppText>
      </View>
    );
  }

  const starts = Date.parse(state.shift.startsAt);
  const minutes = Math.round((starts - now) / 60_000);
  const when =
    minutes > 0
      ? minutes >= 120
        ? t('driver.startsInHours', { count: Math.floor(minutes / 60) })
        : t('driver.startsIn', { count: minutes })
      : t('driver.startedAgo', { count: -minutes });
  const late = !state.canStart && state.startTo !== null && now > Date.parse(state.startTo);

  return (
    <View style={styles.card}>
      <AppText weight="bold" size={fontSizes.sectionTitle - 1}>
        {t('driver.reservedShift')}
      </AppText>
      <View style={styles.inner}>
        <AppText weight="semibold" color={colors.success}>
          {when}
        </AppText>
        <View style={styles.row}>
          <Clock size={18} color={colors.ink2} />
          <AppText weight="semibold">{t('driver.range', { from: cairoTime(state.shift.startsAt), to: cairoTime(state.shift.endsAt) })}</AppText>
        </View>
      </View>
      <Button label={t('driver.start')} disabled={!state.canStart} loading={act.isPending && act.variables === 'start'} onPress={() => run('start')} style={styles.start} />
      {!state.canStart ? (
        <AppText size={fontSizes.caption} color={late ? colors.danger : colors.ink2}>
          {late ? t('driver.startLate') : state.startFrom ? t('driver.startOpens', { time: cairoTime(state.startFrom) }) : ''}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: 'center', paddingVertical: spacing.md },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...cardShadow,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  top: { gap: spacing.lg },
  skeleton: { height: 180, borderRadius: radius.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...cardShadow },
  inner: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  start: { backgroundColor: colors.black },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FDECEA', borderRadius: radius.md, padding: spacing.md },
  grow: { flex: 1 },
});

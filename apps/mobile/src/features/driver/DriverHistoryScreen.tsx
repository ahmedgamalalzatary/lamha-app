import DateTimePicker from '@react-native-community/datetimepicker';
import { type DriverHistoryOrder, formatMoney, orderStatusLabel } from '@tawsela/shared';
import { router } from 'expo-router';
import { ArrowRight, CalendarDays, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useDriverHistory } from './api';

const CAIRO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' });
/** "Wednesday, 18 November 2026": the card's date, in English as in the photo. */
const CARD_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const cardDate = (iso: string) => {
  const p = Object.fromEntries(CARD_DATE.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
};

/** "YYYY-MM-DD" of the phone's own calendar day, as the picker gives it. */
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = (day: string) => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

type Field = 'from' | 'to';

/**
 * طلباتى (حسابي › سجل الطلبات, driver/driver-order-history-date-range-earnings-complaint.jpg): the two
 * date boxes, the outlined blue "بحث", a card per order (code, status pill, store, "الاجمالى" items,
 * the red "تقديم شكوى", the date and the earning in green) and the grey panel with اجمالى الارباح and
 * عدد الطلبات المكتملة. Both dates start on today and an empty range reads "لا يوجد طلبات"
 * (driver-order-history-today-empty.jpg); a card opens the order (driver-order-details-delivered-prepaid.jpg).
 */
export function DriverHistoryScreen() {
  const t = useT();
  const today = CAIRO_DAY.format(new Date());
  const [draft, setDraft] = useState({ from: today, to: today });
  const [range, setRange] = useState(draft);
  const [editing, setEditing] = useState<Field | null>(null);
  const history = useDriverHistory(range.from, range.to);

  const pick = (field: Field, date: Date) => setDraft((d) => ({ ...d, [field]: dayOf(date) }));

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.side}>
          <DirectionalIcon icon={ArrowRight} size={26} color={colors.ink} />
        </PressableScale>
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 4}>
          {t('driver.historyTitle')}
        </AppText>
        <View style={styles.side} />
      </View>

      <View style={styles.dates}>
        <DateBox label={t('driver.historyFrom')} day={draft.from} onPress={() => setEditing('from')} />
        <DateBox label={t('driver.historyTo')} day={draft.to} onPress={() => setEditing('to')} />
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('driver.historySearch')} onPress={() => setRange(draft)} style={styles.search}>
        <Search size={22} color={colors.success} />
        <AppText size={fontSizes.listTitle + 2} color={colors.info}>
          {t('driver.historySearch')}
        </AppText>
      </PressableScale>

      {history.isPending ? (
        <View style={styles.list}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : history.isError ? (
        <View style={styles.list}>
          <AppText color={colors.danger}>{errorMessage(history.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void history.refetch()} />
        </View>
      ) : history.data.orders.length === 0 ? (
        <AppText size={fontSizes.listTitle + 2} style={styles.empty}>
          {t('driver.historyEmpty')}
        </AppText>
      ) : (
        <FlatList
          data={history.data.orders}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={() => void history.refetch()} />}
          renderItem={({ item }) => <Card order={item} />}
        />
      )}

      {history.data ? <Totals earnings={history.data.earnings} delivered={history.data.delivered} /> : null}

      {editing && Platform.OS === 'android' ? (
        <DateTimePicker
          value={dateOf(draft[editing])}
          mode="date"
          maximumDate={new Date()}
          onValueChange={(_, date) => {
            setEditing(null);
            pick(editing, date);
          }}
          onDismiss={() => setEditing(null)}
        />
      ) : null}
      {Platform.OS !== 'android' ? (
        <BottomSheet visible={editing !== null} title={editing === 'to' ? t('driver.historyTo') : t('driver.historyFrom')} onClose={() => setEditing(null)}>
          {editing ? (
            <View style={styles.sheet}>
              <DateTimePicker
                testID="history-date"
                value={dateOf(draft[editing])}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                onValueChange={(_, date) => pick(editing, date)}
              />
              <Button label={t('common.confirm')} onPress={() => setEditing(null)} />
            </View>
          ) : null}
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
}

function DateBox({ label, day, onPress }: { label: string; day: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${label} ${day}`} onPress={onPress} scaleTo={0.98} style={styles.dateBox}>
      <AppText size={fontSizes.listTitle + 1} color={colors.ink2} style={styles.grow}>
        {day}
      </AppText>
      <CalendarDays size={26} color={colors.ink2} />
    </PressableScale>
  );
}

function Card({ order: o }: { order: DriverHistoryOrder }) {
  const t = useT();
  const locale = useLocale();
  const delivered = o.status === 'delivered';
  const tone = delivered ? colors.success : colors.danger;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('driver.orderTitle', { code: o.code })}
      onPress={() => router.push(`/driver-order/${o.id}`)}
      scaleTo={0.99}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <AppText weight="bold" size={fontSizes.sectionTitle + 1} style={styles.grow}>
          {t('driver.historyOrder', { code: o.code })}
        </AppText>
        <View style={[styles.pill, { borderColor: tone }]}>
          <AppText size={fontSizes.listTitle + 1} color={tone}>
            {orderStatusLabel(o.status, locale)}
          </AppText>
        </View>
      </View>
      <View style={styles.cardMiddle}>
        <View style={[styles.grow, styles.facts]}>
          <AppText size={fontSizes.listTitle + 1}>{o.store.name}</AppText>
          <AppText size={fontSizes.listTitle + 1}>{t('driver.historyCount', { count: o.count })}</AppText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('driver.historyComplain', { code: o.code })}
          onPress={() => router.push({ pathname: '/driver-support/[type]', params: { type: 'complaint', orderId: String(o.id), code: o.code } })}
          style={styles.complain}
        >
          <AppText weight="semibold" size={fontSizes.listTitle + 2} color={colors.danger}>
            {t('support.complain')}
          </AppText>
        </PressableScale>
      </View>
      <View style={styles.cardBottom}>
        <AppText size={fontSizes.listTitle} style={styles.grow}>
          {cardDate(o.createdAt)}
        </AppText>
        {o.earning !== null ? (
          <AppText weight="bold" size={fontSizes.listTitle + 3} color={colors.success}>
            {`+ ${formatMoney(o.earning, locale)}`}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Totals({ earnings, delivered }: { earnings: number; delivered: number }) {
  const t = useT();
  const locale = useLocale();
  return (
    <SafeAreaView edges={['bottom']} style={styles.totals}>
      <View accessible style={styles.totalRow}>
        <AppText weight="bold" size={fontSizes.sectionTitle + 1} color={colors.primary}>
          {t('driver.historyEarnings')}
        </AppText>
        <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
          {formatMoney(earnings, locale)}
        </AppText>
      </View>
      <View accessible style={styles.totalRow}>
        <AppText weight="bold" size={fontSizes.sectionTitle + 1} color={colors.primary}>
          {t('driver.historyDelivered')}
        </AppText>
        <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
          {String(delivered)}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  side: { width: sizes.icon, height: sizes.icon, alignItems: 'center', justifyContent: 'center' },
  dates: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.info,
    borderRadius: radius.pill,
  },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.lg },
  skeleton: { height: 170, borderRadius: radius.lg },
  card: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  cardMiddle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  facts: { gap: spacing.md },
  complain: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardBottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
  totals: { backgroundColor: colors.line, borderTopStartRadius: 24, borderTopEndRadius: 24, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  sheet: { gap: spacing.lg, paddingBottom: spacing.md },
  empty: { textAlign: 'center', marginTop: spacing.lg },
});

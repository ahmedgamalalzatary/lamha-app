import type { TranslationKey } from '@/core/i18n';
import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useDriverShift } from '../api/driver';
import { cardShadow } from '../components/parts';

/** Index 0 is Sunday, as the schedule's week. */
const DAYS: TranslationKey[] = ['driver.day0', 'driver.day1', 'driver.day2', 'driver.day3', 'driver.day4', 'driver.day5', 'driver.day6'];
const LETTERS: TranslationKey[] = ['driver.letter0', 'driver.letter1', 'driver.letter2', 'driver.letter3', 'driver.letter4', 'driver.letter5', 'driver.letter6'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CAIRO = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' });

/** "18:00" → "6:00 PM", like the other times in the app. */
const twelveHour = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

interface Day {
  /** 0 Sunday … 6 Saturday. */
  index: number;
  date: number;
}

/** This Cairo week, Saturday to Friday, as the photo's strip (21 Saturday … 27 Friday). */
function thisWeek(): { days: Day[]; today: number } {
  const p = Object.fromEntries(CAIRO.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const today = WEEKDAYS.indexOf(p.weekday!);
  const back = (today + 1) % 7;
  const start = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - back);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + i * 86_400_000);
    return { index: d.getUTCDay(), date: d.getUTCDate() };
  });
  return { days, today };
}

/**
 * نوبات عملي → "نوبات العمل المتوفرة" (driver/driver-shifts-available-week-strip-none-today.jpg): the
 * arrow and the title, the strip of this week's days (letter and date, the chosen one orange,
 * today at first), and under it that day's shift or "لا توجد نوبات اليوم". [Derived] Tawsilty's
 * shift card is not captured: the day's hours in a white card with a clock.
 */
export function DriverShiftsScreen() {
  const t = useT();
  const shift = useDriverShift();
  const [{ days, today }] = useState(thisWeek);
  const [chosen, setChosen] = useState(today);
  const range = shift.data?.week[chosen];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="plain" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.screenTitle + 2}>
          {t('driver.shiftsTitle')}
        </AppText>
      </View>
      <View style={styles.strip}>
        {days.map((day) => {
          const selected = day.index === chosen;
          return (
            <PressableScale
              key={day.index}
              accessibilityRole="button"
              accessibilityLabel={`${t(DAYS[day.index]!)} ${day.date}`}
              accessibilityState={{ selected }}
              onPress={() => setChosen(day.index)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <AppText weight="semibold" size={fontSizes.listTitle + 2} color={selected ? colors.bg : colors.ink}>
                {t(LETTERS[day.index]!)}
              </AppText>
              <AppText size={fontSizes.listTitle + 1} color={selected ? colors.bg : colors.ink}>
                {String(day.date)}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
      {shift.isPending ? (
        <View style={styles.content}>
          <Skeleton style={styles.skeleton} />
        </View>
      ) : shift.isError ? (
        <View style={styles.content}>
          <AppText color={colors.danger}>{errorMessage(shift.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void shift.refetch()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {range ? (
            <View accessible style={styles.card}>
              <Clock size={22} color={colors.primary} />
              <AppText weight="semibold" size={fontSizes.listTitle + 1}>
                {t('driver.range', { from: twelveHour(range.start), to: twelveHour(range.end) })}
              </AppText>
            </View>
          ) : (
            <AppText size={fontSizes.listTitle + 1} style={styles.none}>
              {t('driver.noShiftsDay')}
            </AppText>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  chip: { flex: 1, alignItems: 'center', gap: spacing.xs, backgroundColor: colors.line, borderRadius: radius.md, paddingVertical: spacing.sm },
  chipOn: { backgroundColor: colors.primary },
  content: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 64, borderRadius: radius.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg, ...cardShadow },
  none: { textAlign: 'center', marginTop: spacing.lg },
});

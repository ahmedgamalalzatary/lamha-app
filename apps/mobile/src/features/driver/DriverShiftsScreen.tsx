import type { TranslationKey } from '@/core/i18n';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useDriverShift } from './api';

const DAYS: TranslationKey[] = ['driver.day0', 'driver.day1', 'driver.day2', 'driver.day3', 'driver.day4', 'driver.day5', 'driver.day6'];
/** "18:00" → "6:00 PM", like the other times in the app. */
const twelveHour = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/**
 * نوبات عملي (حسابي › العمل, driver/driver-account-invoices-points-shifts-history.jpg): the week he
 * follows, his own or the global one. [Open] The screen behind the row is not captured.
 */
export function DriverShiftsScreen() {
  const t = useT();
  const shift = useDriverShift();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="grey" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 2}>
          {t('driver.myShifts')}
        </AppText>
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
          {shift.data.week.map((day, i) => (
            <View key={DAYS[i]} accessible style={styles.row}>
              <AppText weight="semibold" style={styles.grow}>
                {t(DAYS[i]!)}
              </AppText>
              <AppText color={day ? colors.ink : colors.ink2}>
                {day ? t('driver.range', { from: twelveHour(day.start), to: twelveHour(day.end) }) : t('driver.dayOff')}
              </AppText>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { padding: spacing.lg, gap: spacing.sm },
  skeleton: { height: 280, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  grow: { flex: 1 },
});

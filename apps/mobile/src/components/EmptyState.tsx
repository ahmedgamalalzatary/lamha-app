import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fontSizes, spacing } from '@/core/theme';
import { AppText } from './AppText';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
}

/** Tawsilty's empty state (contract §6.3): a big soft-orange circle with an icon, a bold title and a grey line. */
export function EmptyState({ icon: Icon, title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <View style={styles.inner}>
          <Icon size={44} color={colors.primary700} strokeWidth={1.8} />
        </View>
      </View>
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle} style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.ink2} style={styles.center}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  // Two soft circles, as in Tawsilty's "لا توجد طلبات".
  circle: {
    width: 166,
    height: 166,
    borderRadius: 83,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  inner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});

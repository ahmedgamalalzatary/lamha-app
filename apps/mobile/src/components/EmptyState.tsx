import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fontSizes, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  /** A button under the text ("اتفرج على المحلات"). */
  action?: { label: string; onPress: () => void };
}

/** lamha's empty state: a pale pen tile with the icon, a semibold title, a grey line, an optional button. */
export function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tile}>
        <Icon size={32} color={colors.primary} strokeWidth={1.8} />
      </View>
      <AppText accessibilityRole="header" weight="semibold" size={fontSizes.sectionTitle} style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.ink2} style={[styles.center, styles.message]}>
          {message}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, paddingVertical: 56, gap: 6 },
  tile: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  message: { maxWidth: 280, lineHeight: 22 },
  action: { marginTop: spacing.lg },
});

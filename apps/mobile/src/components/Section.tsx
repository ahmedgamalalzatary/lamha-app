import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { fontSizes, spacing } from '@/core/theme';
import { AppText } from './AppText';

/** lamha's section: an 18pt title with an optional action on the far side, then its content. */
export function Section({ title, action, children, style }: { title: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.head}>
        <AppText accessibilityRole="header" weight="semibold" size={fontSizes.sectionTitle} style={styles.title}>
          {title}
        </AppText>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  title: { flex: 1 },
});

import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, fontSizes, spacing } from '@/core/theme';

/** A menu section's heading (contract §8.4): bold, with Tawsilty's short orange bar beside it. */
export function SectionTitle({ title, bar = true }: { title: string; bar?: boolean }) {
  return (
    <View style={styles.row}>
      {bar ? <View style={styles.bar} /> : null}
      <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 2}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  bar: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.primary },
});

import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTextStart } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { AppText } from './AppText';

/** A value that cannot be edited here, like the phone card on "التفاصيل الشخصية": grey fill, icon and label, value below. */
export function LockedField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const textAlign = useTextStart();
  return (
    <View style={styles.box} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.head}>
        <Icon size={16} color={colors.ink2} />
        <AppText size={14} color={colors.ink2}>
          {label}
        </AppText>
      </View>
      <AppText weight="semibold" size={17} color="#55575E" style={{ textAlign }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: '#EEEFF3',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

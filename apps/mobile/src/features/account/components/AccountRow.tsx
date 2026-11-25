import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { colors, spacing } from '@/core/theme';

/** A row of "حسابي": icon, bold label, grey chevron at the far end. Red for "حذف الحساب". */
export function AccountRow({ icon: Icon, label, value, danger, disabled, onPress }: {
  icon: LucideIcon;
  label: string;
  /** A number shown before the chevron (the partner's orders count). */
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : `${label}: ${value}`}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.98}
      style={styles.row}
    >
      <Icon size={24} color={color} strokeWidth={1.8} />
      <AppText weight="semibold" size={17} color={color} style={styles.label}>
        {label}
      </AppText>
      {value === undefined ? null : (
        <AppText weight="bold" size={17} color={colors.primary}>
          {value}
        </AppText>
      )}
      <DirectionalIcon icon={ChevronLeft} size={20} color={colors.ink2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg + 2 },
  label: { flex: 1 },
});

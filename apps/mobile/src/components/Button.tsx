import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'soft' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** An icon after the label ("إعادة المحاولة" with its ↻). */
  icon?: LucideIcon;
}

const BG: Record<Variant, string> = { primary: colors.primary, soft: colors.primary50, danger: colors.danger };
const FG: Record<Variant, string> = { primary: colors.bg, soft: colors.primary, danger: colors.bg };

/** Tawsilty's primary button (contract §6.3): full width, rounded, orange; faded while disabled. */
export function Button({ label, onPress, variant = 'primary', loading, disabled, style, icon: Icon }: ButtonProps) {
  const off = !!(disabled || loading);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={[styles.base, { backgroundColor: BG[variant], opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          <AppText weight="semibold" color={FG[variant]} style={styles.label}>
            {label}
          </AppText>
          {Icon ? <Icon size={22} color={FG[variant]} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, paddingHorizontal: 20, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

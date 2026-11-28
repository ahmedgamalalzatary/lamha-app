import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** `soft` is the old name of `secondary`. */
type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'ink' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** An icon after the label ("إعادة المحاولة" with its ↻). */
  icon?: LucideIcon;
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.primary100,
  soft: colors.primary100,
  ghost: 'transparent',
  danger: colors.danger50,
  ink: colors.ink,
  outline: colors.sheet,
};
const FG: Record<Variant, string> = {
  primary: colors.sheet,
  secondary: colors.primary,
  soft: colors.primary,
  ghost: colors.primary,
  danger: colors.danger,
  ink: colors.sheet,
  outline: colors.ink,
};
const SIZE: Record<Size, { height: number; font: number; pad: number; corner: number }> = {
  sm: { height: 36, font: 14, pad: 14, corner: radius.md },
  md: { height: 48, font: 15, pad: 20, corner: radius.lg },
  lg: { height: 56, font: 16, pad: 24, corner: radius.lg },
};

/** lamha's button: pen fill by default, rounded 16, medium label; faded while disabled. */
export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon: Icon }: ButtonProps) {
  const off = !!(disabled || loading);
  const s = SIZE[size];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={[
        styles.base,
        { minHeight: s.height, paddingHorizontal: s.pad, borderRadius: s.corner, backgroundColor: BG[variant], opacity: disabled ? 0.45 : 1 },
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          <AppText weight="medium" size={s.font} color={FG[variant]} style={styles.label}>
            {label}
          </AppText>
          {Icon ? <Icon size={20} color={FG[variant]} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: colors.line },
  label: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

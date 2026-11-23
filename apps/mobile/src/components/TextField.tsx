import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, fonts, radius, spacing } from '@/core/theme';
import { AppText } from './AppText';

interface Props extends Omit<TextInputProps, 'style'> {
  /** Sits on the top border, as in Tawsilty's "التفاصيل الشخصية". Also the field's accessible name. */
  label?: string;
  /** Read by screen readers when there is no visible label (the invite code box). */
  accessibilityLabel?: string;
  error?: string | null;
  /** A password: hidden, with the eye to show it. */
  secure?: boolean;
  /** Shows "0/100" under the field (needs maxLength). */
  counter?: boolean;
}

/** Tawsilty's outlined field: soft fill, thin border, the label notched into the top border. */
export function TextField({ label, error, secure, counter, value = '', maxLength, accessibilityLabel, ...rest }: Props) {
  const t = useT();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, focused && styles.focused, !!error && styles.invalid]}>
        {label ? (
          <AppText size={12} color={colors.ink2} style={styles.label}>
            {label}
          </AppText>
        ) : null}
        <TextInput
          {...rest}
          value={value}
          maxLength={maxLength}
          accessibilityLabel={accessibilityLabel ?? label}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.ink2}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, !label && styles.centered]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.showPassword')}
            accessibilityState={{ selected: !hidden }}
            hitSlop={12}
            onPress={() => setHidden((h) => !h)}
            style={styles.eye}
          >
            {hidden ? <Eye size={22} color={colors.ink2} /> : <EyeOff size={22} color={colors.ink2} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText size={12} color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      {counter && maxLength ? (
        <AppText size={12} color={colors.ink2} style={styles.counter}>
          {`${value.length}/${maxLength}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E9EAEE',
    borderRadius: radius.md + 2,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
  label: {
    position: 'absolute',
    top: -9,
    start: spacing.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xs,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: spacing.md, textAlign: 'right' },
  centered: { textAlign: 'center' },
  eye: { paddingStart: spacing.sm },
  counter: { alignSelf: 'flex-end' },
});

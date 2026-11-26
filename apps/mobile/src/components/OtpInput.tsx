import { OTP, toLatinDigits } from '@tawsela/shared';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius } from '@/core/theme';
import { AppText } from './AppText';

interface Props {
  value: string;
  onChange: (code: string) => void;
  label: string;
}

/**
 * Tawsilty's 4 boxes ("رمز التحقق"): one hidden field behind them takes the digits, and the boxes
 * show them left to right, with an orange caret in the next box.
 */
export function OtpInput({ value, onChange, label }: Props) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);
  return (
    <Pressable onPress={() => input.current?.focus()} style={styles.row} accessible={false}>
      {Array.from({ length: OTP.length }, (_, i) => {
        const current = focused && i === Math.min(value.length, OTP.length - 1) && value.length < OTP.length;
        return (
          <View key={i} style={[styles.box, current && styles.current]}>
            {value[i] ? (
              <AppText weight="bold" size={24}>
                {value[i]}
              </AppText>
            ) : current ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(toLatinDigits(text).replace(/\D/g, '').slice(0, OTP.length))}
        accessibilityLabel={label}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={OTP.length + 2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The digits read left to right in Arabic too, as in the screenshot.
  row: { flexDirection: 'row', direction: 'ltr', justifyContent: 'space-between', gap: 16 },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 78,
    borderWidth: 1,
    borderColor: colors.otpBorder,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: { borderColor: colors.lineStrong },
  caret: { width: 2, height: 30, backgroundColor: colors.primary },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});

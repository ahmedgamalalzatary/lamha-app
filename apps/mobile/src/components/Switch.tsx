import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from '@/core/theme';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** lamha's switch: green track when on, grey when off, a white knob that slides. */
export function Switch({ value, onChange, label, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.success : colors.line, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: radius.pill, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.sheet,
    ...shadows.sheet,
    transitionProperty: ['start'],
    transitionDuration: 200,
  },
  // In RTL "start" is the right edge: off sits on the right, as in lamha.
  knobOff: { start: 2 },
  knobOn: { start: 22 },
});

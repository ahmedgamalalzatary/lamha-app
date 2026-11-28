import { useEffect } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { EASE_OUT } from '@/core/motion/motion';
import { colors } from '@/core/theme';
import { AppText } from './AppText';

type Tone = 'success' | 'danger' | 'primary' | 'ink';
const TONE: Record<Tone, string> = { success: colors.success, danger: colors.danger, primary: colors.primary, ink: colors.ink };
const SIZE = { sm: 15, md: 19, lg: 28 } as const;

interface Props {
  label: string;
  tone?: Tone;
  size?: keyof typeof SIZE;
  /** Drops in like a rubber stamp hitting the paper (lamha's `stamp-in`). */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** lamha's rubber stamp: a tilted double-ruled label ("وصل", "اتلغى", "مسترد"). */
export function Stamp({ label, tone = 'success', size = 'md', animate, style }: Props) {
  const reduced = useReduceMotion();
  const color = TONE[tone];
  const drop = useSharedValue(animate && !reduced ? 0 : 1);
  useEffect(() => {
    if (animate && !reduced) drop.value = withTiming(1, { duration: 420, easing: EASE_OUT });
  }, [animate, reduced, drop]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.92 * drop.value,
    transform: [{ scale: 1.9 - 0.9 * drop.value }, { rotate: `${-16 + 9 * drop.value}deg` }],
  }));
  return (
    <Animated.View accessible accessibilityRole="text" accessibilityLabel={label} style={[styles.outer, { borderColor: color }, anim, style]}>
      <Animated.View style={[styles.inner, { borderColor: color }]}>
        <AppText weight="bold" size={SIZE[size]} color={color}>
          {label}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'flex-start', borderWidth: 2.5, borderRadius: 10, padding: 2 },
  inner: { borderWidth: 1.5, borderRadius: 7, paddingHorizontal: 10, paddingTop: 3, paddingBottom: 5 },
});

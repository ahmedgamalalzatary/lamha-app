import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { colors, radius } from '@/core/theme';

/** A band of light crossing the block. Percentages are of the band's own width. */
const SWEEP = {
  from: { transform: [{ translateX: '-100%' }] },
  to: { transform: [{ translateX: '100%' }] },
} as const;

/** Tawsilty's loading state (contract §6.3): grey blocks in the shape of the content, with a soft shimmer. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReduceMotion();
  return (
    <View style={[styles.block, style]}>
      {reduced ? null : (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sweep]}>
          <LinearGradient
            colors={['transparent', colors.shimmer, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden', backgroundColor: colors.input, borderRadius: radius.sm },
  sweep: {
    animationName: SWEEP,
    animationDuration: '1300ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
});

import type { ViewStyle } from 'react-native';
import { cubicBezier, Easing } from 'react-native-reanimated';

/** Motion tokens. UI motion stays under 300ms; anything a finger moves settles with a spring. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/**
 * The same ease-out for Reanimated CSS transitions. It must be Reanimated's cubicBezier() object (a
 * CSS curve string throws on the device); Expo's style types only allow a string, hence the cast.
 */
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1) as unknown as ViewStyle['transitionTimingFunction'];

export const PRESS_MS = 120;
/** A sheet let go of: settles without bouncing past where it goes. */
export const SETTLE = { duration: 300, dampingRatio: 0.8 } as const;

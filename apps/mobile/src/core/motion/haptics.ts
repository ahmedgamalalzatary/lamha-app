import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Fire and forget: a phone without a vibrator (or the web) just stays quiet. */
const run = (buzz: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  try {
    buzz().catch(() => undefined);
  } catch {
    // A missing native module throws before returning a promise.
  }
};

/** One buzz per thing the person did, never the only feedback (many phones have haptics off). */
export const haptic = {
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { EASE_OUT } from '@/core/motion/motion';
import { colors, radius, spacing } from '@/core/theme';
import { AppText } from './AppText';

/** Red pill for errors, green for success, dark for hints (contract §6.3). */
export type ToastKind = 'error' | 'success' | 'hint';

interface Shown {
  id: number;
  message: string;
  kind: ToastKind;
}

const SHOW_MS = 3000;
const TOAST_IN = FadeInDown.duration(260).easing(EASE_OUT);
const TOAST_OUT = FadeOutDown.duration(200).easing(EASE_OUT);
const BG: Record<ToastKind, string> = { error: colors.danger, success: colors.success, hint: colors.toastDark };

const useToastStore = create<{ current: Shown | null }>(() => ({ current: null }));
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;

/** `toast.show('عذراً الخدمة مغلقة الآن', 'error')`. One toast at a time; a new one replaces the old. */
export const toast = {
  show(message: string, kind: ToastKind = 'hint') {
    clearTimeout(timer);
    const id = nextId++;
    useToastStore.setState({ current: { id, message, kind } });
    timer = setTimeout(() => {
      if (useToastStore.getState().current?.id === id) useToastStore.setState({ current: null });
    }, SHOW_MS);
  },
  clear() {
    clearTimeout(timer);
    useToastStore.setState({ current: null });
  },
};

/** Render once, at the root of the app. */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const insets = useSafeAreaInsets();
  if (!current) return null;
  return (
    <Animated.View
      key={current.id}
      entering={TOAST_IN}
      exiting={TOAST_OUT}
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + 90 }]}
    >
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.pill, { backgroundColor: BG[current.kind] }]}
      >
        <AppText weight="medium" color={colors.bg} style={styles.text}>
          {current.message}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: spacing.lg, end: spacing.lg, alignItems: 'center', zIndex: 100 },
  pill: { borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  text: { textAlign: 'center' },
});

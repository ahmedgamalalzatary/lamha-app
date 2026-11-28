import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { EASE_OUT } from '@/core/motion/motion';
import { colors, radius, shadows, spacing } from '@/core/theme';
import { AppText } from './AppText';

/** lamha's toast: a dark ink card at the top; errors and successes add a coloured icon (contract §6.3). */
export type ToastKind = 'error' | 'success' | 'hint';

interface Shown {
  id: number;
  message: string;
  kind: ToastKind;
}

const SHOW_MS = 3000;
const TOAST_IN = FadeInUp.duration(260).easing(EASE_OUT);
const TOAST_OUT = FadeOutUp.duration(200).easing(EASE_OUT);

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
      style={[styles.wrap, { top: insets.top + spacing.lg }]}
    >
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.card}
      >
        {current.kind === 'success' ? <CircleCheck size={18} color={colors.marker} /> : null}
        {current.kind === 'error' ? <CircleAlert size={18} color={colors.primary100} /> : null}
        <AppText weight="medium" color={colors.sheet} style={styles.text}>
          {current.message}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: spacing.lg, end: spacing.lg, alignItems: 'center', zIndex: 100 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 400, borderRadius: radius.card, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.ink, ...shadows.lift },
  text: { flexShrink: 1, textAlign: 'center' },
});

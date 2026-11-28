import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { useT } from '@/core/i18n';
import { colors, radius, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { useDragToClose } from './drag-to-close';

interface Props {
  visible: boolean;
  title?: string;
  /** A grey line under the title. */
  description?: string;
  onClose: () => void;
  /** A long body scrolls inside the sheet under a fixed title. */
  scroll?: boolean;
  children: ReactNode;
}

/**
 * lamha's bottom sheet: white, 22pt rounded top, a grabber, a 19pt title with an optional grey line
 * and a round close button. Closes from the backdrop, the close button, or by dragging the grabber
 * down; never grows under the status bar.
 */
export function BottomSheet({ visible, title, description, onClose, scroll = false, children }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const drag = useDragToClose(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      {/* A modal is its own window on Android: the drag needs its own gesture root. */}
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          <Animated.View style={[styles.backdrop, drag.backdrop]}>
            {/* With a title, the round close button is the one screen readers get; the backdrop is for fingers. */}
            <Pressable accessible={!title} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.fill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            onLayout={drag.onLayout}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, maxHeight: height - insets.top - 24 }, drag.sheet]}
          >
            <GestureDetector gesture={drag.pan}>
              <View style={styles.grip}>
                <View style={styles.grabber} />
                {title ? (
                  <View style={styles.head}>
                    <View style={styles.titles}>
                      <AppText accessibilityRole="header" weight="semibold" size={19}>
                        {title}
                      </AppText>
                      {description ? <AppText color={colors.ink2}>{description}</AppText> : null}
                    </View>
                    <PressableScale accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} scaleTo={0.9} hitSlop={6} style={styles.close}>
                      <X size={18} color={colors.ink2} />
                    </PressableScale>
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            {scroll ? (
              <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdrop },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl - 4,
    gap: spacing.md,
  },
  grip: { gap: spacing.md, paddingTop: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingBottom: spacing.xs },
  titles: { flex: 1, gap: 4 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  grabber: { alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: colors.line },
  body: { flexShrink: 1 },
});

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/core/hooks/useReduceMotion';
import { useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { useDragToClose } from './drag-to-close';

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  /** A long body scrolls inside the sheet under a fixed title. */
  scroll?: boolean;
  children: ReactNode;
}

/**
 * Tawsilty's bottom sheet (contract §6.3): white, rounded top, a grabber. Closes from the backdrop
 * or by dragging the grabber down; never grows under the status bar.
 */
export function BottomSheet({ visible, title, onClose, scroll = false, children }: Props) {
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
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.fill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            onLayout={drag.onLayout}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, maxHeight: height - insets.top - 24 }, drag.sheet]}
          >
            <GestureDetector gesture={drag.pan}>
              <View style={styles.grip}>
                <View style={styles.grabber} />
                {title ? (
                  <AppText weight="bold" size={fontSizes.sectionTitle} style={styles.title}>
                    {title}
                  </AppText>
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
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  grip: { gap: spacing.md, paddingTop: spacing.sm },
  // A hairline under the title, as in the sort and rating sheets.
  title: { paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
  body: { flexShrink: 1 },
});

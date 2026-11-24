import { Modal, StyleSheet, View } from 'react-native';
import { useT } from '@/core/i18n';
import { colors, fontSizes, spacing } from '@/core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  /** The action button, e.g. "حذف" or "تأكيد". */
  confirmLabel: string;
  /**
   * Tawsilty has two dialogs (contract §6.3):
   * - danger (cart "حذف المنتج"): rounded card, red pill action, orange "إلغاء";
   * - primary (address "حذف العنوان"): square card, orange rounded action, red "إلغاء".
   * - outline (account "تسجيل الخروج"): centred question over a line, an orange pill and a
   *   red-outlined "إلغاء" pill of the same width.
   */
  tone?: 'danger' | 'primary' | 'outline';
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE = {
  danger: { card: 20, action: colors.danger, actionRadius: 999, cancel: colors.primary },
  primary: { card: 4, action: colors.primary, actionRadius: 8, cancel: colors.danger },
} as const;

export function ConfirmDialog({ visible, title, message, confirmLabel, tone = 'danger', onConfirm, onCancel }: Props) {
  const t = useT();
  if (tone === 'outline') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.backdrop}>
          <View style={[styles.card, styles.outlineCard]} accessibilityViewIsModal>
            <AppText size={fontSizes.sectionTitle} style={styles.centred}>
              {title}
            </AppText>
            <View style={styles.line} />
            <View style={styles.pills}>
              <PressableScale accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={[styles.pill, styles.pillOn]}>
                <AppText size={17} color={colors.bg}>
                  {confirmLabel}
                </AppText>
              </PressableScale>
              <PressableScale accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onCancel} style={[styles.pill, styles.pillOff]}>
                <AppText size={17} color={colors.danger}>
                  {t('common.cancel')}
                </AppText>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  const look = TONE[tone];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: look.card }]} accessibilityViewIsModal>
          <AppText weight="bold" size={fontSizes.sectionTitle}>
            {title}
          </AppText>
          {message ? <AppText size={15}>{message}</AppText> : null}
          <View style={styles.actions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              style={[styles.confirm, { backgroundColor: look.action, borderRadius: look.actionRadius }]}
            >
              <AppText weight="bold" color={colors.bg}>
                {confirmLabel}
              </AppText>
            </PressableScale>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onCancel} style={styles.cancel}>
              <AppText weight="bold" color={look.cancel}>
                {t('common.cancel')}
              </AppText>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl * 2 - 4 },
  card: { width: '100%', backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.xl },
  // Row-reverse puts the action at the far end (left in RTL), as in the screenshots.
  actions: { flexDirection: 'row-reverse', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  cancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  confirm: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xl },
  outlineCard: { borderRadius: 24, gap: spacing.lg },
  centred: { textAlign: 'center' },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  pills: { flexDirection: 'row', gap: spacing.lg },
  pill: { flex: 1, minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.primary },
  pillOff: { borderWidth: 1.5, borderColor: colors.danger },
});

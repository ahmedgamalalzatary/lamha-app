import { formatMoney, type PartnerAction, parseRequestPrice } from '@tawsela/shared';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { usePartnerOrder, usePartnerOrders, usePartnerStep } from '../api/partner';
import { usePartnerLive } from '../hooks/live';
import { LineChoices, LineImage } from './parts';
import { PriceField, RequestDetails } from './RequestParts';

/** Mounted once in the partner area: the live connection and the new-order popup over every tab. */
export function PartnerLive() {
  usePartnerLive();
  return <NewOrderPopup />;
}

/**
 * The popup as soon as an order arrives (partner/partner-home-new-orders-accept-reject-popup.png):
 * "طلب رقم # 506898", the question, ملاحظات العميل in red, "المنتجات 1" in orange, each product with
 * its round photo, name, orange price and an outlined "1 عناصر" pill, then a green قبول and a red
 * رفض. [Client] It also shows how the customer pays. The print and mute icons wait for a printer
 * and the ring sound (Phase 16). It shows the oldest new order; the back button leaves it for later.
 * An iPhone has no back button, so there a ✕ does the same [Derived]. A pharmacy request shows its
 * photo and text instead of products, and قبول waits for its price (§8.11).
 */
function NewOrderPopup() {
  const t = useT();
  const locale = useLocale();
  const pending = usePartnerOrders('pending_review');
  const [later, setLater] = useState<ReadonlySet<number>>(new Set());
  const next = pending.data?.findLast((o) => !later.has(o.id));
  const order = usePartnerOrder(next?.id);
  const step = usePartnerStep();
  const [typed, setTyped] = useState<{ id: number; text: string }>({ id: 0, text: '' });
  if (!next || !order.data || order.data.status !== 'pending_review') return null;
  const o = order.data;
  const priceText = typed.id === o.id ? typed.text : '';
  const needsPrice = o.request !== null && !o.request.priced;
  const price = needsPrice ? parseRequestPrice(priceText) : null;
  const answer = (action: PartnerAction) =>
    step.mutate({ id: o.id, action, price: action === 'accept' && price !== null ? price : undefined }, { onSuccess: () => step.reset() });
  const leave = () => setLater((s) => new Set(s).add(o.id));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={leave}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          {Platform.OS === 'ios' ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={t('partner.later')} onPress={leave} scaleTo={0.9} style={styles.close}>
              <X size={22} color={colors.ink2} />
            </PressableScale>
          ) : null}
          <ScrollView contentContainerStyle={styles.content}>
            <AppText accessibilityRole="header" size={fontSizes.sectionTitle + 1}>
              {t('partner.popupTitle', { code: o.code })}
            </AppText>
            <AppText size={fontSizes.sectionTitle - 1}>{t('partner.popupQuestion')}</AppText>
            {o.note.trim() ? (
              <View style={styles.note}>
                <AppText weight="bold" size={fontSizes.sectionTitle}>
                  {t('partner.customerNote')}
                </AppText>
                <AppText weight="semibold" size={fontSizes.sectionTitle - 1} color={colors.danger}>
                  {o.note}
                </AppText>
              </View>
            ) : null}
            {o.request ? (
              <>
                <RequestDetails request={o.request} />
                {needsPrice ? <PriceField value={priceText} onChange={(text) => setTyped({ id: o.id, text })} /> : null}
              </>
            ) : (
              <AppText weight="bold" size={fontSizes.sectionTitle} color={colors.primary}>
                {t('partner.productsCount', { count: o.lines.length })}
              </AppText>
            )}
            {o.lines.map((line, i) => (
              <View key={i} style={styles.line}>
                <LineImage line={line} />
                <View style={styles.grow}>
                  <AppText size={fontSizes.listTitle + 1}>{line.name}</AppText>
                  <LineChoices line={line} />
                  <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.primary}>
                    {formatMoney(line.unitPrice, locale)}
                  </AppText>
                </View>
                <View style={styles.pieces}>
                  <AppText weight="semibold" color={colors.primary}>
                    {t('partner.pieces', { count: line.quantity })}
                  </AppText>
                </View>
              </View>
            ))}
            <View style={styles.pay}>
              <AppText color={colors.ink2}>{t('partner.paymentMethod')}</AppText>
              <AppText weight="semibold" style={styles.grow}>
                {t('checkout.cash')}
              </AppText>
              <AppText weight="bold">{formatMoney(o.total, locale)}</AppText>
            </View>
            {step.error ? (
              <AppText accessibilityRole="alert" color={colors.danger}>
                {errorMessage(step.error)}
              </AppText>
            ) : null}
          </ScrollView>
          <View style={styles.buttons}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('partner.accept')}
              accessibilityState={{ disabled: step.isPending || (needsPrice && price === null) }}
              disabled={step.isPending || (needsPrice && price === null)}
              onPress={() => answer('accept')}
              style={[styles.button, { backgroundColor: needsPrice && price === null ? colors.ink2 : colors.success }]}
            >
              <AppText weight="semibold" size={17} color={colors.bg}>
                {t('partner.accept')}
              </AppText>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('partner.reject')}
              disabled={step.isPending}
              onPress={() => answer('reject')}
              style={[styles.button, { backgroundColor: colors.danger }]}
            >
              <AppText weight="semibold" size={17} color={colors.bg}>
                {t('partner.reject')}
              </AppText>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.bg, borderRadius: 4, maxHeight: '85%', paddingBottom: spacing.xl },
  close: { position: 'absolute', top: spacing.sm, end: spacing.sm, zIndex: 1, width: sizes.icon, height: sizes.icon, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.lg },
  note: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  pieces: { borderWidth: 1, borderColor: colors.ink2, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pay: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.input, borderRadius: radius.sm, padding: spacing.md },
  buttons: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl },
  button: { flex: 1, alignItems: 'center', paddingVertical: spacing.md + 2, borderRadius: 4 },
});

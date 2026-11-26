import { type DriverAction, type DriverOrderDetails, formatMoney } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, MapPin, MessageSquareText, MessageCircle, Phone } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { LineChoices, LineImage } from '@/features/partner/parts';
import { useDriverOrder, useDriverStep } from './api';
import { cardShadow } from './parts';

const mapLink = (p: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
/** 01xxxxxxxxx → 201xxxxxxxxx for wa.me. */
const whatsapp = (phone: string) => `https://wa.me/2${phone.replace(/\D/g, '')}`;

/**
 * "تفاصيل الطلب #485804" (driver/driver-order-details-pay-store-collect-cash-out-for-delivery.jpg):
 * white cards on grey — البائع with "عرض الموقع" and عنوان البائع; the customer with call, SMS and
 * WhatsApp and their area; المنتجات folded with the count and items total, opening to "2× name"
 * lines with [Client] the product photo; ادفع نقداً للبائع in orange; المبلغ — تحصيل النقود; then the
 * orange step button. [Derived] The steps before خارج للتوصيل (وصلت للمتجر, waiting for the store)
 * and تم التوصيل after it use the same button. [Open] Stores have no written address yet: عنوان
 * البائع shows the store's zone. A finished order opened from طلباتى shows the same cards without
 * the button (driver-order-details-delivered-prepaid.jpg, driver-order-details-cancelled-cash.jpg).
 */
export function DriverOrderScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useDriverOrder(Number(id));
  const step = useDriverStep();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="grey" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 2} style={styles.headerTitle}>
          {order.data ? t('driver.orderTitle', { code: order.data.code }) : ''}
        </AppText>
      </View>
      {order.isPending ? (
        <View style={styles.content}>
          <Skeleton style={styles.skeleton} />
        </View>
      ) : order.isError ? (
        <View style={styles.content}>
          <AppText color={colors.danger}>{errorMessage(order.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void order.refetch()} />
        </View>
      ) : (
        <Details
          order={order.data}
          busy={step.isPending}
          onStep={(action) =>
            step.mutate(
              { id: order.data.id, action },
              {
                onSuccess: (o) => {
                  if (o.status === 'delivered') router.back();
                },
                onError: (e) => toast.show(errorMessage(e), 'error'),
              },
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function ShowLocation({ at }: { at: { lat: number; lng: number } | null }) {
  const t = useT();
  if (!at) return null;
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={t('driver.showLocation')} onPress={() => void Linking.openURL(mapLink(at))} style={styles.row}>
      <MapPin size={18} color={colors.primary} />
      <AppText weight="semibold" color={colors.primary}>
        {t('driver.showLocation')}
      </AppText>
    </PressableScale>
  );
}

function Details({ order: o, busy, onStep }: { order: DriverOrderDetails; busy: boolean; onStep: (action: DriverAction) => void }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const money = (n: number) => formatMoney(n, locale);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.row}>
            <AppText weight="bold" size={fontSizes.listTitle + 1} style={styles.grow}>
              {t('driver.seller')}
            </AppText>
            <ShowLocation at={o.store.location} />
          </View>
          <AppText color={colors.ink2}>{o.store.name}</AppText>
          <AppText weight="bold" size={fontSizes.listTitle + 1}>
            {t('driver.sellerAddress')}
          </AppText>
          <AppText color={colors.ink2}>{o.store.area ?? '—'}</AppText>
        </Card>

        <Card>
          <View style={styles.row}>
            <AppText weight="bold" size={fontSizes.listTitle + 1} style={styles.grow}>
              {o.customer.name}
            </AppText>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('driver.call')} hitSlop={8} onPress={() => void Linking.openURL(`tel:${o.customer.phone}`)}>
              <Phone size={22} color={colors.ink} />
            </PressableScale>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('driver.sms')} hitSlop={8} onPress={() => void Linking.openURL(`sms:${o.customer.phone}`)}>
              <MessageSquareText size={22} color={colors.ink} />
            </PressableScale>
            <PressableScale accessibilityRole="button" accessibilityLabel={t('driver.whatsapp')} hitSlop={8} onPress={() => void Linking.openURL(whatsapp(o.customer.phone))}>
              <MessageCircle size={22} color={colors.success} />
            </PressableScale>
          </View>
          <View style={styles.row}>
            <AppText color={colors.ink2} style={styles.grow}>
              {o.customer.address ?? o.area ?? '—'}
            </AppText>
            <ShowLocation at={o.customer.location} />
          </View>
          {o.note.trim() ? <AppText color={colors.danger}>{o.note}</AppText> : null}
        </Card>

        <Card>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('driver.products')}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            style={styles.row}
          >
            <AppText weight="bold" size={fontSizes.listTitle + 1} style={styles.grow}>
              {t('driver.products')}
            </AppText>
            <View style={styles.end}>
              <AppText weight="semibold" color={colors.primary}>
                {t('driver.productsCount', { count: o.count })}
              </AppText>
              <AppText weight="semibold" color={colors.primary}>
                {money(o.itemsTotal)}
              </AppText>
            </View>
            <Chevron size={20} color={colors.ink2} />
          </PressableScale>
          {open
            ? o.lines.map((line, i) => (
                <View key={i} style={[styles.row, styles.line]}>
                  <LineImage line={line} />
                  <View style={styles.grow}>
                    <AppText weight="semibold">{`${line.quantity}× ${line.name}`}</AppText>
                    <LineChoices line={line} />
                  </View>
                  <AppText color={colors.ink2}>{money(line.unitPrice * line.quantity)}</AppText>
                </View>
              ))
            : null}
        </Card>

        <Card>
          <View style={styles.row}>
            <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.primary} style={styles.grow}>
              {t('driver.payStore')}
            </AppText>
            <AppText weight="bold" size={fontSizes.listTitle + 2} color={colors.primary}>
              {money(o.storeFromDriver)}
            </AppText>
          </View>
        </Card>

        <Card>
          <AppText weight="bold" size={fontSizes.listTitle + 2}>
            {t('driver.amount')}
          </AppText>
          <View style={styles.row}>
            <AppText color={colors.ink2} style={styles.grow}>
              {t('driver.collectCash')}
            </AppText>
            {/* driver/driver-order-details-delivered-prepaid.jpg. [Derived] When the wallet and the points covered it all. */}
            <AppText weight="bold" size={fontSizes.listTitle + 2}>
              {o.total - o.walletPaid - o.pointsPaid <= 0 ? t('driver.prepaid') : money(o.total)}
            </AppText>
          </View>
          {/* [Derived] He collects that much less; the app owes it to him [Owner, 2026-11-26]. */}
          {o.walletPaid > 0 ? (
            <View style={styles.row}>
              <AppText color={colors.ink2} style={styles.grow}>
                {t('wallet.paid')}
              </AppText>
              <AppText weight="semibold" color={colors.ink2}>
                {money(o.walletPaid)}
              </AppText>
            </View>
          ) : null}
          {o.pointsPaid > 0 ? (
            <View style={styles.row}>
              <AppText color={colors.ink2} style={styles.grow}>
                {t('points.paid')}
              </AppText>
              <AppText weight="semibold" color={colors.ink2}>
                {money(o.pointsPaid)}
              </AppText>
            </View>
          ) : null}
        </Card>
      </ScrollView>
      <StepButton order={o} busy={busy} onStep={onStep} />
    </>
  );
}

/** The next step: وصلت للمتجر → خارج للتوصيل (once the store marked it ready) → تم التوصيل. */
function StepButton({ order: o, busy, onStep }: { order: DriverOrderDetails; busy: boolean; onStep: (action: DriverAction) => void }) {
  const t = useT();
  if (o.status === 'out_for_delivery') {
    return (
      <View style={styles.footer}>
        <Button label={t('driver.delivered')} loading={busy} onPress={() => onStep('delivered')} style={styles.stepButton} />
      </View>
    );
  }
  if (o.status !== 'preparing' && o.status !== 'ready') return null;
  if (!o.atStore) {
    return (
      <View style={styles.footer}>
        <Button label={t('driver.arrived')} loading={busy} onPress={() => onStep('arrived')} style={styles.stepButton} />
      </View>
    );
  }
  return (
    <View style={styles.footer}>
      {o.status === 'preparing' ? (
        <AppText color={colors.ink2} style={styles.center}>
          {t('driver.waitReady')}
        </AppText>
      ) : null}
      <Button label={t('driver.out')} disabled={o.status !== 'ready'} loading={busy} onPress={() => onStep('out')} style={styles.stepButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    ...cardShadow,
  },
  headerTitle: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  skeleton: { height: 320, borderRadius: radius.md },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  end: { alignItems: 'flex-end' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: spacing.sm },
  grow: { flex: 1 },
  footer: { padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  stepButton: { alignSelf: 'center', paddingHorizontal: spacing.xxl },
  center: { textAlign: 'center' },
});

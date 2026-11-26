import { canReorder, cashDue, type CustomerOrderDetails, customerStatusLabel, customerSteps, formatMoney } from '@tawsela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, CircleCheck, Headset, IdCard, MapPin, Star } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { mediaUrl } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { session } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, sizes, spacing } from '@/core/theme';
import { useCart } from '@/features/cart/api/cart';
import { LineChoices, orderDate, useWhen } from '@/features/partner/components/parts';
import { RequestDetails } from '@/features/partner/components/RequestParts';
import { ordersApi, useMyOrder } from '../api/orders';

/**
 * "تفاصيل الطلب" (contract §8.8, customer/orders/order-details-delivered-driver-fees-payment.jpg): the
 * status pill, the store with the date and number, عنوان التوصيل, معلومات المندوب, the lines and the
 * totals. No service fee (owner, 2026-11-25). While the order runs it also shows its steps [Open: the
 * active screen is not captured; no live tracking, §15.2]; once over, "اطلب تاني" [Client].
 */
export function CustomerOrderScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useMyOrder(Number(id));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="plain" />
        <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 2} style={styles.title}>
          {t('orders.detailsTitle')}
        </AppText>
        <View style={styles.headerSide} />
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
        <Details order={order.data} />
      )}
    </SafeAreaView>
  );
}

function Section({ children, last }: { children: ReactNode; last?: boolean }) {
  return <View style={[styles.section, last && styles.sectionLast]}>{children}</View>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText size={fontSizes.listTitle + 1} weight={strong ? 'bold' : 'regular'} style={styles.grow}>
        {label}
      </AppText>
      <AppText size={fontSizes.listTitle + 1} weight={strong ? 'bold' : 'semibold'} color={strong ? colors.ink : colors.ink2}>
        {value}
      </AppText>
    </View>
  );
}

function Details({ order: o }: { order: CustomerOrderDetails }) {
  const t = useT();
  const locale = useLocale();
  const when = useWhen();
  const money = (n: number) => formatMoney(n, locale);
  const delivered = o.status === 'delivered';
  const over = o.status === 'rejected' || o.status === 'cancelled';
  const steps = delivered ? null : customerSteps(o.status, o.mode);
  const logo = mediaUrl(o.store.logo);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.pill, delivered ? styles.pillOk : over ? styles.pillBad : null]}>
        {delivered ? <CircleCheck size={18} color={colors.bg} fill={colors.success} /> : null}
        <AppText weight="semibold" color={delivered ? colors.success : over ? colors.danger : colors.primary700}>
          {customerStatusLabel(o.status, o.mode, locale)}
        </AppText>
      </View>

      <Section>
        <View style={styles.row}>
          <View style={styles.storeLogo}>{logo ? <Image source={{ uri: logo }} style={styles.logoImage} accessibilityIgnoresInvertColors /> : null}</View>
          <View style={styles.grow}>
            <AppText weight="bold" size={fontSizes.sectionTitle + 1}>
              {o.store.name}
            </AppText>
            <AppText color={colors.ink2}>{orderDate(o.createdAt)}</AppText>
            <AppText color={colors.ink2}>{t('orders.number', { code: o.code })}</AppText>
          </View>
        </View>
      </Section>

      {steps ? (
        <Section>
          <AppText weight="bold" size={fontSizes.sectionTitle}>
            {t('orders.status')}
          </AppText>
          {steps.map((s) => (
            <View key={s.status} accessibilityLabel={customerStatusLabel(s.status, o.mode, locale)} accessibilityState={{ selected: s.state === 'current' }} style={styles.row}>
              <View style={[styles.dot, s.state === 'done' ? styles.dotDone : s.state === 'current' ? styles.dotCurrent : null]}>
                {s.state === 'done' ? <Check size={14} color={colors.bg} /> : null}
              </View>
              <AppText weight={s.state === 'current' ? 'bold' : 'regular'} color={s.state === 'next' ? colors.ink2 : colors.ink}>
                {customerStatusLabel(s.status, o.mode, locale)}
              </AppText>
            </View>
          ))}
        </Section>
      ) : null}

      <Section>
        <View style={styles.row}>
          <AppText weight="bold" size={fontSizes.sectionTitle} style={styles.grow}>
            {o.mode === 'delivery' ? t('orders.address') : t('cart.pickup')}
          </AppText>
          <MapPin size={24} color={colors.primary} />
        </View>
        <AppText color={colors.ink2} size={fontSizes.listTitle}>
          {o.mode === 'delivery' ? o.addressText : o.store.name}
        </AppText>
      </Section>

      {o.driver ? (
        <Section>
          <View style={styles.row}>
            <AppText weight="bold" size={fontSizes.sectionTitle} style={styles.grow}>
              {t('orders.driverInfo')}
            </AppText>
            <IdCard size={24} color={colors.primary} />
          </View>
          <AppText color={colors.ink2}>{t('orders.driverName')}</AppText>
          <AppText weight="bold" size={fontSizes.listTitle + 1}>
            {o.driver.name}
          </AppText>
        </Section>
      ) : null}

      <Section>
        <AppText weight="bold" size={fontSizes.sectionTitle}>
          {t('orders.detailsTitle')}
        </AppText>
        {o.request ? <RequestDetails request={o.request} /> : null}
        {o.request && !o.request.priced ? <AppText color={colors.danger}>{t('pharmacy.priceLater')}</AppText> : null}
        {o.lines.map((line, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.grow}>
              <AppText weight="semibold" size={fontSizes.listTitle + 1}>
                {t('partner.line', { quantity: line.quantity, name: line.name })}
              </AppText>
              <LineChoices line={line} />
            </View>
            <AppText color={colors.ink2}>{money(line.unitPrice * line.quantity)}</AppText>
          </View>
        ))}
      </Section>

      <Section>
        <Row label={t('orders.subtotal')} value={money(o.itemsTotal)} />
        {o.mode === 'delivery' ? <Row label={t('orders.deliveryFee')} value={money(o.deliveryFee)} /> : null}
        {o.couponDiscount > 0 ? <Row label={t('checkout.couponDiscount')} value={`-${money(o.couponDiscount)}`} /> : null}
        {o.walletPaid - o.invitePaid > 0 ? <Row label={t('wallet.paid')} value={`-${money(o.walletPaid - o.invitePaid)}`} /> : null}
        {o.invitePaid > 0 ? <Row label={t('wallet.invitePaid')} value={`-${money(o.invitePaid)}`} /> : null}
        {o.pointsPaid > 0 ? <Row label={`${t('points.paid')} (${t('points.count', { count: o.pointsSpent })})`} value={`-${money(o.pointsPaid)}`} /> : null}
      </Section>

      <Section last>
        <Row label={t('orders.total')} value={money(cashDue(o))} strong />
        <Row label={t('orders.paymentMethod')} value={t(cashDue(o) === 0 ? 'wallet.paidInFull' : 'checkout.cash')} strong />
        <Row label={t(o.mode === 'delivery' ? 'orders.deliveryTime' : 'orders.pickupTime')} value={when(o.scheduledFor)} strong />
      </Section>

      {o.rating ? (
        <View accessible accessibilityLabel={t('rating.yours', { count: o.rating.stars })} style={styles.row}>
          <AppText weight="bold" size={fontSizes.listTitle + 1} style={styles.grow}>
            {t('rating.yoursTitle')}
          </AppText>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={20} color={n <= o.rating!.stars ? colors.primary : colors.line} fill={n <= o.rating!.stars ? colors.primary : 'transparent'} />
          ))}
        </View>
      ) : delivered ? (
        <Button label={t('rating.rate')} variant="soft" onPress={() => router.push({ pathname: '/rate/[id]', params: { id: String(o.id) } })} />
      ) : null}

      {/* A pharmacy request has no products to put back in a cart. */}
      {canReorder(o.status) && !o.request ? <Reorder order={o} /> : null}

      {/* [Client] A problem with an order opens a complaint about it; nothing is refunded from the app (§8.8). */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('support.orderHelp')}
        onPress={() => router.push({ pathname: '/support/[type]', params: { type: 'complaint', orderId: String(o.id), code: o.code } })}
        style={styles.help}
      >
        <Headset size={20} color={colors.primary700} />
        <AppText weight="semibold" color={colors.primary700}>
          {t('support.orderHelp')}
        </AppText>
      </PressableScale>
    </ScrollView>
  );
}

/**
 * "اطلب تاني" [Client: only here, inside طلباتي]: the order goes back in its store's cart, beside any
 * other store's cart (contract §8.6), and that cart opens. Lines gone from the menu are left out with
 * a note [Derived].
 */
function Reorder({ order }: { order: CustomerOrderDetails }) {
  const t = useT();
  const { run } = useCart(order.store.id);
  const reorder = useSubmit(async () => {
    const generation = session.generation();
    try {
      let skipped = 0;
      await run(async () => {
        const result = await ordersApi.reorder(order.id);
        skipped = result.skipped;
        return result;
      });
      if (session.generation() !== generation) return;
      if (skipped > 0) toast.show(t('orders.skipped', { count: skipped }), 'error');
      router.push(`/cart/${order.store.id}`);
    } catch (e) {
      if (session.generation() === generation) toast.show(errorMessage(e), 'error');
    }
  });
  return <Button label={t('orders.reorder')} loading={reorder.busy} onPress={() => void reorder.run()} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { flex: 1, textAlign: 'center' },
  headerSide: { width: sizes.touch },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  skeleton: { height: 400, borderRadius: radius.md },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary50,
  },
  pillOk: { backgroundColor: colors.success50 },
  pillBad: { backgroundColor: colors.input },
  section: { gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  sectionLast: { borderBottomWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  storeLogo: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.input },
  logoImage: { width: '100%', height: '100%' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCurrent: { borderColor: colors.primary },
  help: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
});

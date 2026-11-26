import { cashDue, formatMoney, orderStatusLabel, type PartnerAction, type PartnerOrderDetails, parseRequestPrice } from '@tawsela/shared';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, MapPin, NotebookText, Phone } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage } from '@/core/api/error-message';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { usePartnerOrder, usePartnerStep } from './api';
import { LineChoices, orderDate, useWhen } from './parts';
import { PriceField, RequestDetails } from './RequestParts';

/**
 * The store's order details (contract §9, partner/partner-order-details-preparing-receive-from-driver.png
 * and partner-order-details-delivered-driver-info.png), a full screen without the tab bar. No service
 * fee (owner, 2026-11-25); the print icon waits for a printer [Open].
 */
export function PartnerOrderScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = usePartnerOrder(Number(id));
  const step = usePartnerStep();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="grey" />
        <View style={styles.headerText}>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.sectionTitle + 2}>
            {order.data ? t('partner.orderTitle', { code: order.data.code }) : ''}
          </AppText>
          {order.data ? (
            <View style={styles.dateRow}>
              <CalendarDays size={16} color={colors.primary} />
              <AppText color={colors.ink2}>{orderDate(order.data.createdAt)}</AppText>
            </View>
          ) : null}
        </View>
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
        <Details
          order={order.data}
          busy={step.isPending}
          error={step.error ? errorMessage(step.error) : undefined}
          onStep={(action, price) => step.mutate({ id: order.data.id, action, price })}
        />
      )}
    </SafeAreaView>
  );
}

function Section({ children, last }: { children: ReactNode; last?: boolean }) {
  return <View style={[styles.section, last && styles.sectionLast]}>{children}</View>;
}

function Money({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <AppText size={fontSizes.listTitle + 1} style={styles.grow}>
        {label}
      </AppText>
      <AppText size={fontSizes.listTitle + 1} color={color ?? colors.ink2}>
        {value}
      </AppText>
    </View>
  );
}

function Details({
  order: o,
  busy,
  error,
  onStep,
}: {
  order: PartnerOrderDetails;
  busy: boolean;
  error?: string;
  onStep: (action: PartnerAction, price?: number) => void;
}) {
  const t = useT();
  const [priceText, setPriceText] = useState('');
  const needsPrice = o.status === 'pending_review' && o.request !== null && !o.request.priced;
  const price = needsPrice ? parseRequestPrice(priceText) : null;
  const locale = useLocale();
  const when = useWhen();
  const money = (n: number) => formatMoney(n, locale);
  const delivered = o.status === 'delivered';
  const collects = o.mode === 'delivery' && o.deliveredBy === 'platform' && o.payoutOption !== 'nothing';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.pill, delivered ? styles.pillOk : o.status === 'rejected' || o.status === 'cancelled' ? styles.pillBad : null]}>
        {delivered ? <Check size={16} color={colors.success} /> : null}
        <AppText weight="semibold" color={delivered ? colors.success : o.status === 'rejected' || o.status === 'cancelled' ? colors.danger : colors.primary700}>
          {orderStatusLabel(o.status, locale)}
        </AppText>
      </View>

      <Section>
        <AppText weight="semibold" size={fontSizes.listTitle + 1}>
          {o.customer.name}
        </AppText>
        <View style={styles.row}>
          <AppText weight="semibold" size={fontSizes.listTitle + 2} style={styles.grow}>
            {o.customer.phone}
          </AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('partner.call')}
            onPress={() => void Linking.openURL(`tel:${o.customer.phone}`)}
            style={styles.call}
          >
            <Phone size={18} color={colors.success} />
            <AppText weight="semibold" size={17} color={colors.success}>
              {t('partner.call')}
            </AppText>
          </PressableScale>
        </View>
      </Section>

      <Section>
        {o.mode === 'delivery' ? (
          <View style={styles.row}>
            <View style={styles.grow}>
              <AppText weight="semibold" size={fontSizes.sectionTitle}>
                {t('partner.deliverTo')}
              </AppText>
              <AppText color={colors.ink2} size={fontSizes.listTitle}>
                {o.addressText}
              </AppText>
            </View>
            <MapPin size={24} color={colors.primary} />
          </View>
        ) : (
          <AppText weight="semibold" size={fontSizes.sectionTitle}>
            {t('cart.pickup')}
          </AppText>
        )}
      </Section>

      <Section>
        <View style={styles.row}>
          <AppText weight="semibold" size={fontSizes.sectionTitle} style={styles.grow}>
            {t(o.mode === 'delivery' ? 'partner.deliveryTime' : 'partner.pickupTime')}
          </AppText>
          <AppText weight="semibold" size={fontSizes.listTitle + 1}>
            {when(o.scheduledFor)}
          </AppText>
        </View>
      </Section>

      {o.note.trim() ? (
        <Section>
          <View style={styles.row}>
            <View style={styles.grow}>
              <AppText weight="semibold" size={fontSizes.sectionTitle}>
                {t('partner.customerNote')}
              </AppText>
              <AppText weight="semibold" size={fontSizes.listTitle + 1} color={colors.danger}>
                {o.note}
              </AppText>
            </View>
            <NotebookText size={24} color={colors.primary} />
          </View>
        </Section>
      ) : null}

      {o.request ? (
        <Section>
          <RequestDetails request={o.request} />
          {o.request.priced ? null : <AppText color={colors.danger}>{t('pharmacy.priceLater')}</AppText>}
        </Section>
      ) : null}

      {o.request ? null : (
        <Section>
          <View style={styles.row}>
            <AppText weight="semibold" size={fontSizes.sectionTitle} style={styles.grow}>
              {t('partner.products')}
            </AppText>
            <AppText color={colors.primary}>{t('orders.items', { count: o.lines.length })}</AppText>
          </View>
          {o.lines.map((line, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.grow}>
                <AppText size={fontSizes.listTitle + 1}>{t('partner.line', { quantity: line.quantity, name: line.name })}</AppText>
                <LineChoices line={line} />
              </View>
              <AppText color={colors.ink2}>{money(line.unitPrice * line.quantity)}</AppText>
            </View>
          ))}
        </Section>
      )}

      <Section>
        <Money label={t('partner.itemsTotal')} value={money(o.itemsTotal)} />
        <Money label={t('partner.deliveryFee')} value={money(o.deliveryFee)} />
        <Money label={t('partner.paymentFee')} value={money(0)} />
        {/* A discount shows in red (§9): here what the wallet paid; المجموع is what the customer still pays. */}
        {o.couponDiscount > 0 ? <Money label={t('checkout.couponDiscount')} value={`-${money(o.couponDiscount)}`} color={colors.danger} /> : null}
        {o.walletPaid - o.invitePaid > 0 ? <Money label={t('wallet.paid')} value={`-${money(o.walletPaid - o.invitePaid)}`} color={colors.danger} /> : null}
        {o.invitePaid > 0 ? <Money label={t('wallet.invitePaid')} value={`-${money(o.invitePaid)}`} color={colors.danger} /> : null}
        {o.pointsPaid > 0 ? <Money label={t('points.paid')} value={`-${money(o.pointsPaid)}`} color={colors.danger} /> : null}
      </Section>

      <Section last={!o.driver && !collects}>
        <Money label={t('partner.total')} value={money(cashDue(o))} color={colors.ink} />
        <Money label={t('partner.paymentMethod')} value={t(cashDue(o) === 0 ? 'wallet.paidInFull' : 'checkout.cash')} color={colors.ink} />
      </Section>

      {o.driver ? (
        <Section>
          <Money label={t('partner.driver')} value={o.driver.name} color={colors.ink} />
        </Section>
      ) : null}

      {collects ? (
        <View style={styles.collect}>
          <AppText weight="semibold" size={fontSizes.listTitle + 2} color={colors.primary} style={styles.grow}>
            {t('partner.collect')}
          </AppText>
          <AppText weight="semibold" size={fontSizes.listTitle + 4} color={colors.primary}>
            {money(o.storeFromDriver)}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <AppText accessibilityRole="alert" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      {needsPrice ? <PriceField value={priceText} onChange={setPriceText} /> : null}

      {o.status === 'pending_review' ? (
        <View style={styles.answer}>
          <Button
            label={t('partner.accept')}
            loading={busy}
            disabled={needsPrice && price === null}
            onPress={() => onStep('accept', price ?? undefined)}
            style={[styles.grow, needsPrice && price === null ? null : { backgroundColor: colors.success }]}
          />
          <Button label={t('partner.reject')} variant="danger" disabled={busy} onPress={() => onStep('reject')} style={styles.grow} />
        </View>
      ) : o.status === 'preparing' ? (
        <>
          <AppText color={colors.ink2} size={fontSizes.listTitle} style={styles.centred}>
            {t('partner.readyNote')}
          </AppText>
          <Button label={t('partner.ready')} loading={busy} onPress={() => onStep('ready')} />
        </>
      ) : o.status === 'ready' && o.mode === 'pickup' ? (
        <Button label={t('partner.collected')} loading={busy} onPress={() => onStep('collected')} />
      ) : o.mode === 'delivery' && o.deliveredBy === 'store' && o.status === 'ready' ? (
        <Button label={t('partner.out')} loading={busy} onPress={() => onStep('out')} />
      ) : o.mode === 'delivery' && o.deliveredBy === 'store' && o.status === 'out_for_delivery' ? (
        <Button label={t('partner.delivered')} loading={busy} onPress={() => onStep('delivered')} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerText: { flex: 1, alignItems: 'center', gap: spacing.xs },
  headerSide: { width: 40 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  skeleton: { height: 400, borderRadius: radius.md },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary50,
  },
  pillOk: { backgroundColor: colors.success50 },
  pillBad: { backgroundColor: colors.input },
  section: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  sectionLast: { borderBottomWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.success50,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  collect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary100,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  centred: { textAlign: 'center' },
  answer: { flexDirection: 'row', gap: spacing.md },
});

import { cashDue, type CheckoutQuote, type CustomerCart, formatMoney, type LatLng, slotLabel, walletPays } from '@tawsela/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, Lock, MapPin, ShoppingCart, Wallet } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { ApiRequestError } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useSession } from '@/core/auth/session';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useLocale, useT } from '@/core/i18n';
import { colors, fontSizes, radius, spacing } from '@/core/theme';
import { useChosenAddress } from '@/features/addresses/chosen-address';
import { AddressesSheet } from '@/features/addresses/components/AddressesSheet';
import { confirmOnMap, usePickedSpot } from '@/features/addresses/picked-spot';
import { useCart } from '@/features/cart/api/cart';
import { useStorePage } from '@/features/store/api/store';
import { walletKey } from '@/features/wallet/api';
import { checkoutApi, newRequestId } from './api';

/** "سيصل خلال 30 دقيقة" when the store page has not said its own time yet. */
const DEFAULT_MINUTES = 30;

/**
 * Tawsilty's "إتمام الدفع" (contract §8.7, customer/checkout/*): the delivery address with "تغيير", now or
 * a later slot today, cash on delivery, the bill (products and the distance delivery fee, no service
 * fee) and "تنفيذ الطلب <total>". A delivery is confirmed on the map first [Client, §8.6]. "رصيدك"
 * pays from the wallet (Phase 17); the coupon box joins in Phase 20.
 */
export function CheckoutScreen() {
  const t = useT();
  const { cart, query } = useCart();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <BackButton variant="square" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/customer/cart'))} />
        <AppText accessibilityRole="header" size={fontSizes.sectionTitle} weight="bold">
          {t('checkout.title')}
        </AppText>
      </View>
      {cart ? (
        <CheckoutBody key={cart.id} cart={cart} />
      ) : query.isPending ? (
        <View style={styles.section}>
          <Skeleton style={styles.skeleton} />
          <Skeleton style={styles.skeleton} />
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={ShoppingCart} title={t('cart.empty')} message={t('cart.emptyMessage')} />
          <Button label={t('cart.browse')} onPress={() => router.navigate('/customer')} />
        </View>
      )}
    </SafeAreaView>
  );
}

function CheckoutBody({ cart }: { cart: CustomerCart }) {
  const t = useT();
  const locale = useLocale();
  const client = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  const delivery = cart.mode === 'delivery';
  const { address } = useChosenAddress();
  const page = useStorePage(cart.store.id);
  const addressId = delivery ? address?.id : undefined;
  /** The spot confirmed on the map, for the address it was confirmed for. */
  const [confirmed, setConfirmed] = useState<{ addressId: number; spot: LatLng } | null>(null);
  const location = confirmed && confirmed.addressId === addressId ? confirmed.spot : undefined;
  const [slot, setSlot] = useState<number | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [addressesOpen, setAddressesOpen] = useState(false);
  /** "رصيد المحفظة": off until the customer switches it on [Derived]. */
  const [payWallet, setPayWallet] = useState(false);
  const requestId = useRef(newRequestId());
  /** Stops listening for the map's "تأكيد الموقع", while the map is open. */
  const awaitingMap = useRef<(() => void) | null>(null);

  const quoteKey = ['checkout', userId, cart.id, cart.total, cart.mode, addressId ?? null, location?.lat ?? null, location?.lng ?? null];
  const quote = useQuery({
    queryKey: quoteKey,
    queryFn: () => checkoutApi.quote({ addressId, location }),
    enabled: !delivery || addressId !== undefined,
  });
  const bill = quote.data;

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['cart', userId] });
    void client.invalidateQueries({ queryKey: ['checkout', userId] });
  };

  /** `picked`: a spot just confirmed on the map, for this address; it is kept once the server prices it. */
  const submit = useSubmit(async (shown: CheckoutQuote, spot?: LatLng, picked?: number) => {
    // The map may have moved the spot: price it before placing, and stop if the bill changed.
    const current = spot && picked !== undefined ? await checkoutApi.quote({ addressId: picked, location: spot }) : shown;
    if (spot && picked !== undefined) {
      client.setQueryData([...quoteKey.slice(0, 5), picked, spot.lat, spot.lng], current);
      setConfirmed({ addressId: picked, spot });
    }
    const walletPaid = payWallet ? walletPays(current.walletBalance, current.total) : 0;
    if (current.total !== shown.total || walletPaid !== (payWallet ? walletPays(shown.walletBalance, shown.total) : 0)) {
      throw new ApiRequestError(409, 'The bill changed', 'CHECKOUT_TOTAL_CHANGED');
    }
    try {
      await checkoutApi.place({
        cartId: current.cartId,
        addressId,
        location: spot,
        slot,
        expectedTotal: current.total,
        expectedWalletPaid: walletPaid,
        requestId: requestId.current,
      });
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 409) refresh();
      throw e;
    }
    client.setQueryData(['cart', userId], { cart: null });
    void client.invalidateQueries({ queryKey: ['orders', userId] });
    if (walletPaid > 0) void client.invalidateQueries({ queryKey: [...walletKey, userId] });
    toast.show(t('checkout.placed'), 'success');
    router.replace('/customer/orders');
  });

  // A map left open when the screen goes stops listening.
  useEffect(() => () => awaitingMap.current?.(), []);

  const place = () => {
    if (!bill) return;
    if (!delivery || location) {
      void submit.run(bill, location);
      return;
    }
    if (!address) return;
    const forAddress = address.id;
    // Back from the map with "تأكيد الموقع": go on with that spot.
    awaitingMap.current?.();
    awaitingMap.current = usePickedSpot.subscribe((state) => {
      if (!state.confirmed || !state.spot) return;
      awaitingMap.current?.();
      awaitingMap.current = null;
      usePickedSpot.setState({ confirmed: false });
      void submit.run(bill, { lat: state.spot.lat, lng: state.spot.lng }, forAddress);
    });
    confirmOnMap({ lat: address.lat, lng: address.lng });
  };

  const minutes = page.data?.deliveryMinutes ?? DEFAULT_MINUTES;
  const slots = bill?.slots ?? [];
  const walletPaid = bill && payWallet ? walletPays(bill.walletBalance, bill.total) : 0;
  const toPay = bill ? cashDue({ total: bill.total, walletPaid }) : 0;

  return (
    <>
      <ScrollView style={styles.grow} contentContainerStyle={styles.body}>
        <View style={styles.section}>
          {delivery ? (
            <>
              <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle}>
                {t('checkout.address')}
              </AppText>
              <View style={styles.card}>
                <View style={styles.pin}>
                  <MapPin size={20} color={colors.primary} />
                </View>
                <AppText weight="semibold" style={styles.grow} numberOfLines={1}>
                  {address?.landmark ?? t('checkout.chooseAddress')}
                </AppText>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t('checkout.change')}
                  onPress={() => (address ? setAddressesOpen(true) : router.push('/address/map'))}
                  hitSlop={8}
                >
                  <AppText weight="semibold" color={colors.primary}>
                    {t('checkout.change')}
                  </AppText>
                </PressableScale>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <View style={styles.pin}>
                <MapPin size={20} color={colors.primary} />
              </View>
              <AppText weight="semibold" style={styles.grow}>
                {t('checkout.pickupFrom', { store: cart.store.name })}
              </AppText>
            </View>
          )}

          <View accessibilityRole="radiogroup" style={styles.choices}>
            <Choice
              label={t(delivery ? 'checkout.now' : 'checkout.nowPickup', { minutes })}
              checked={slot === null}
              onPress={() => setSlot(null)}
            />
            <Choice
              label={slot === null ? t('checkout.later') : t('checkout.laterAt', { time: slotLabel(slot) })}
              checked={slot !== null}
              onPress={() => {
                setPicking(slot);
                setSlotsOpen(true);
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle}>
            {t('checkout.yourBalance')}
          </AppText>
          {/* customer/checkout/checkout-address-time-wallet-payment.png, without "شحن المحفظة" (top-up excluded). */}
          <View style={styles.walletCard}>
            <View style={styles.pin}>
              <Wallet size={20} color={colors.primary} />
            </View>
            <View style={styles.grow}>
              <AppText weight="semibold">{t('wallet.balance')}</AppText>
              {bill ? (
                bill.walletBalance > 0 ? (
                  <AppText color={colors.ink2} size={fontSizes.body}>
                    {t('checkout.available', { amount: formatMoney(bill.walletBalance, locale) })}
                  </AppText>
                ) : (
                  <AppText color={colors.danger} size={fontSizes.body}>
                    {t('checkout.noBalance')}
                  </AppText>
                )
              ) : null}
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={t('wallet.balance')}
              accessibilityState={{ disabled: !bill || bill.walletBalance <= 0, checked: payWallet }}
              value={payWallet && !!bill && bill.walletBalance > 0}
              disabled={!bill || bill.walletBalance <= 0}
              trackColor={{ true: colors.primary100, false: colors.line }}
              thumbColor={payWallet ? colors.primary : colors.bg}
              onValueChange={setPayWallet}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle}>
            {t('checkout.payment')}
          </AppText>
          <View accessibilityRole="radiogroup" style={styles.payments}>
            <View accessible accessibilityRole="radio" accessibilityLabel={t('checkout.cash')} accessibilityState={{ checked: true }} style={styles.payment}>
              <Banknote size={22} color={colors.primary} />
              <AppText weight="semibold" style={styles.grow}>
                {t('checkout.cash')}
              </AppText>
              <View style={[styles.radio, styles.radioPayment]}>
                <View style={[styles.radioDot, styles.radioDotPayment]} />
              </View>
            </View>
          </View>
          <View style={styles.secure}>
            <Lock size={14} color={colors.ink2} />
            <AppText color={colors.ink2} size={fontSizes.body}>
              {t('checkout.secure')}
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText accessibilityRole="header" weight="bold" size={fontSizes.listTitle}>
            {t('checkout.summary')}
          </AppText>
          {bill ? (
            <Summary bill={bill} walletPaid={walletPaid} toPay={toPay} locale={locale} />
          ) : quote.isError ? (
            <View style={styles.failed}>
              <AppText color={colors.danger}>{errorMessage(quote.error)}</AppText>
              <Button label={t('common.retry')} variant="soft" onPress={() => void quote.refetch()} />
            </View>
          ) : delivery && addressId === undefined ? null : (
            <Skeleton style={styles.skeleton} />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('checkout.place')}
          accessibilityState={{ disabled: !bill || submit.busy, busy: submit.busy }}
          disabled={!bill || submit.busy}
          onPress={place}
          style={[styles.placeButton, { opacity: !bill || submit.busy ? 0.5 : 1 }]}
        >
          <AppText weight="bold" color={colors.bg}>
            {t('checkout.place')}
          </AppText>
          {bill ? (
            <AppText weight="bold" color={colors.bg}>
              {formatMoney(toPay, locale)}
            </AppText>
          ) : null}
        </PressableScale>
      </View>

      <BottomSheet visible={slotsOpen} title={t('checkout.slotsTitle')} onClose={() => setSlotsOpen(false)} scroll>
        <View accessibilityRole="radiogroup">
          {slots.length === 0 ? (
            <AppText color={colors.ink2}>{t('checkout.noSlots')}</AppText>
          ) : (
            slots.map((s) => (
              <PressableScale
                key={s}
                accessibilityRole="radio"
                accessibilityLabel={slotLabel(s)}
                accessibilityState={{ checked: picking === s }}
                onPress={() => setPicking(s)}
                style={styles.slot}
              >
                <AppText weight="semibold" style={styles.grow}>
                  {slotLabel(s)}
                </AppText>
                <View style={styles.radio}>{picking === s ? <View style={styles.radioDot} /> : null}</View>
              </PressableScale>
            ))
          )}
        </View>
        <Button
          label={t('checkout.pickSlot')}
          disabled={picking === null}
          onPress={() => {
            setSlot(picking);
            setSlotsOpen(false);
          }}
        />
      </BottomSheet>
      <AddressesSheet visible={addressesOpen} onClose={() => setAddressesOpen(false)} />
    </>
  );
}

function Choice({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress} style={[styles.choice, checked && styles.choiceOn]}>
      <AppText weight="semibold" style={styles.grow}>
        {label}
      </AppText>
      <View style={styles.radio}>{checked ? <View style={styles.radioDot} /> : null}</View>
    </PressableScale>
  );
}

/** The wallet's part shows in red under the fee, and الإجمالي is what is left to pay in cash [Derived]. */
function Summary({ bill, walletPaid, toPay, locale }: { bill: CheckoutQuote; walletPaid: number; toPay: number; locale: 'ar' | 'en' }) {
  const t = useT();
  const row = (label: string, value: string, color?: string): ReactNode => (
    <View style={styles.summaryRow}>
      <AppText color={colors.ink2}>{label}</AppText>
      <AppText color={color}>{value}</AppText>
    </View>
  );
  return (
    <View style={styles.summary}>
      {row(t('checkout.subtotal'), formatMoney(bill.itemsTotal, locale))}
      {bill.mode === 'delivery' ? row(t('checkout.deliveryFee'), formatMoney(bill.deliveryFee, locale)) : null}
      {walletPaid > 0 ? row(t('wallet.paid'), `-${formatMoney(walletPaid, locale)}`, colors.danger) : null}
      <View style={[styles.summaryRow, styles.total]}>
        <AppText weight="bold" size={fontSizes.listTitle}>
          {t('checkout.total')}
        </AppText>
        <AppText weight="bold" size={fontSizes.listTitle}>
          {formatMoney(toPay, locale)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  empty: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  body: { paddingBottom: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skeleton: { height: 64, borderRadius: radius.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  choices: { gap: spacing.md },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  choiceOn: { borderWidth: 2, borderColor: colors.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.ink2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink },
  radioPayment: { borderColor: colors.primary },
  radioDotPayment: { backgroundColor: colors.primary },
  walletCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md },
  payments: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.xs },
  payment: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.primary50, paddingHorizontal: spacing.md },
  secure: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  failed: { gap: spacing.md },
  summary: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  total: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  placeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.primary, paddingHorizontal: spacing.xl },
  slot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
});

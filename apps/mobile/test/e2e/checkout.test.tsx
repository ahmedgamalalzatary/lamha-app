import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deliverySlots, slotLabel } from '@tawsela/shared';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { resetChosenAddresses } from '@/features/addresses/chosen-address';
import { MapPickerScreen } from '@/features/addresses/screens/MapPickerScreen';
import { cartApi } from '@/features/cart/api/cart';
import { CartScreen } from '@/features/cart/screens/CartScreen';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
import { OrdersScreen } from '@/features/checkout/OrdersScreen';
import { insertProduct, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

// The native map has no native side under Jest. The stand-in has one test button for a finger
// panning the map away, out of every delivery zone.
type MockRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
jest.mock('react-native-maps', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = forwardRef(({ onRegionChangeComplete }: { onRegionChangeComplete?: (r: MockRegion, d?: { isGesture: boolean }) => void }, ref) => {
    useImperativeHandle(ref, () => ({ animateToRegion: (r: MockRegion) => onRegionChangeComplete?.(r) }));
    return (
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="test: pan to Alexandria"
          onPress={() => onRegionChangeComplete?.({ latitude: 31.2, longitude: 29.9, latitudeDelta: 0.002, longitudeDelta: 0.002 }, { isGesture: true })}
        >
          <Text>pan</Text>
        </Pressable>
      </View>
    );
  });
  return { __esModule: true, default: MapView, Marker: () => null, PROVIDER_GOOGLE: 'google' };
});
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  hasServicesEnabledAsync: async () => true,
  getCurrentPositionAsync: async () => ({ coords: { latitude: 29.3205, longitude: 30.8364 } }),
  reverseGeocodeAsync: async () => [{ district: 'Qesm Al Fayoum' }],
}));
jest.mock('@/features/addresses/map-available', () => ({ mapAvailable: () => true, mapProvider: () => 'google' }));

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'customer/cart': CartScreen,
  'customer/orders': OrdersScreen,
  checkout: CheckoutScreen,
  'address/map': MapPickerScreen,
};

const FAYOUM = '[{"lat":29.25,"lng":30.78},{"lat":29.36,"lng":30.78},{"lat":29.36,"lng":30.9},{"lat":29.25,"lng":30.9}]';
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let store: number;
let shawarma: number;

/** Cairo's minute of the day, as the server counts slots. */
const cairoMinute = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute');
};

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  resetChosenAddresses();
  toast.clear();
  await resetDb();
  const customer = await insertUser('customer', '01554459196');
  const zone = (await sql<ResultSetHeader>("INSERT INTO zones (name, polygon) VALUES ('الفيوم', ?)", [FAYOUM])).insertId;
  await sql(
    `INSERT INTO addresses (user_id, zone_id, type, building, apartment, street, landmark, phone, lat, lng, is_default)
     VALUES (?, ?, 'apartment', 'مبنى 2', 'شقه 2', 'شارع 2', 'temp', '01554459196', 29.3205, 30.8364, true)`,
    [customer, zone],
  );
  // 2.8 km from the address: 20 for the first 2 km and 10 for the started third (§8.7).
  store = await insertStore('شاورما الساقية', 'restaurant', { pickupAllowed: true });
  await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [zone, store]);
  shawarma = await insertProduct(store, 'شاورما فراخ', 85);
  await session.signIn(await signInAs('01554459196'));
  await cartApi.add({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] });
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

async function openCheckout() {
  await renderApp(ROUTES, { initialUrl: '/customer/cart' });
  await screen.findByText('شاورما فراخ');
  await press('تابع للدفع');
  expect(await screen.findByText('إتمام الدفع')).toBeTruthy();
}

describe('checkout (contract §8.7; real API)', () => {
  it('shows the bill with the distance fee, confirms the spot on the map and places the order', async () => {
    await openCheckout();
    expect(screen.getByText('temp')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'سيصل خلال 25 دقيقة' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: 'الدفع عند الاستلام' })).toBeTruthy();
    // An empty wallet cannot be switched on; no top-up (excluded), no coupon yet (Phase 20), and
    // no service fee (owner, 2026-11-25).
    expect(screen.getByText('رصيدك')).toBeTruthy();
    expect(await screen.findByText('لا يوجد رصيد متاح')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'رصيد المحفظة' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByText('شحن المحفظة')).toBeNull();
    expect(screen.queryByText('رسوم الخدمة')).toBeNull();
    expect(await screen.findByText('30.00 ج.م')).toBeTruthy();
    expect(screen.getByText('170.00 ج.م')).toBeTruthy();

    await press('تنفيذ الطلب');
    // The map opens on the address's spot, close enough to confirm.
    expect(await screen.findByText('موقع التوصيل')).toBeTruthy();
    await press('تأكيد الموقع');

    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    const [order] = await sql<{ id: number; total: string; delivery_fee: string; lat: string; scheduled_for: Date | null }[]>(
      'SELECT id, total, delivery_fee, lat, scheduled_for FROM orders',
    );
    expect(order).toMatchObject({ total: '200.00', delivery_fee: '30.00', lat: '29.320500', scheduled_for: null });
    const card = await screen.findByLabelText(`طلب رقم #${100000 + order!.id}`);
    expect(within(card).getByText('قيد المراجعة')).toBeTruthy();
    expect(within(card).getByText('200.00 ج.م')).toBeTruthy();
    expect((await cartApi.get()).cart).toBeNull();
  });

  it('a spot moved out of the store\'s zone is refused and nothing is ordered', async () => {
    await openCheckout();
    await screen.findByText('30.00 ج.م');
    await press('تنفيذ الطلب');
    await screen.findByText('موقع التوصيل');
    await press('test: pan to Alexandria');
    await press('تأكيد الموقع');
    expect(await screen.findByText('التوصيل غير متاح لهذا الموقع من هذا المتجر')).toBeTruthy();
    expect(await sql<unknown[]>('SELECT id FROM orders')).toHaveLength(0);
  });

  it('a fee changed by the admin meanwhile shows the new bill first, then the next tap places it', async () => {
    await openCheckout();
    await screen.findByText('30.00 ج.م');
    await sql('INSERT INTO delivery_settings (id, base_fee) VALUES (1, 25) ON DUPLICATE KEY UPDATE base_fee = 25');
    await press('تنفيذ الطلب');
    await screen.findByText('موقع التوصيل');
    await press('تأكيد الموقع');
    expect(await screen.findByText('تغيّر إجمالي الطلب، راجع الملخص ثم اضغط تنفيذ الطلب')).toBeTruthy();
    expect(await screen.findByText('35.00 ج.م')).toBeTruthy();
    expect(await sql<unknown[]>('SELECT id FROM orders')).toHaveLength(0);

    // The spot is confirmed already: this tap places the order.
    await press('تنفيذ الطلب');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    expect(await sql<{ total: string }[]>('SELECT total FROM orders')).toEqual([{ total: '205.00' }]);
  });

  it('"رصيد المحفظة" pays what the wallet holds; the rest is cash [Owner, 2026-11-26]', async () => {
    const [{ id: me }] = await sql<{ id: number }[]>("SELECT id FROM users WHERE phone = '01554459196'");
    await sql('UPDATE users SET wallet_balance = 50 WHERE id = ?', [me]);
    const { cart } = await cartApi.get();
    await cartApi.edit({ cartId: cart!.id, mode: 'pickup' });
    await openCheckout();
    expect(await screen.findByText('المتاح 50.00 ج.م')).toBeTruthy();
    const wallet = screen.getByRole('switch', { name: 'رصيد المحفظة' });
    expect(wallet.props.value).toBe(false);
    expect(screen.queryByText('المدفوع من المحفظة')).toBeNull();

    await fireEvent(wallet, 'valueChange', true);
    expect(await screen.findByText('المدفوع من المحفظة')).toBeTruthy();
    expect(screen.getByText('-50.00 ج.م')).toBeTruthy();
    // The total and "تنفيذ الطلب 120.00 ج.م": what is left to pay in cash.
    expect(screen.getAllByText('120.00 ج.م')).toHaveLength(2);

    await press('تنفيذ الطلب');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    expect(await sql('SELECT total, wallet_paid FROM orders')).toEqual([{ total: '170.00', wallet_paid: '50.00' }]);
    expect(await sql('SELECT wallet_balance FROM users WHERE id = ?', [me])).toEqual([{ wallet_balance: '0.00' }]);
  });

  it('"نقاطي" cannot be switched on below the minimum', async () => {
    await sql("UPDATE users SET points_balance = 99 WHERE phone = '01554459196'");
    await openCheckout();
    expect(await screen.findByText('باقي 1 نقطة للاستبدال')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'نقاطي' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('"نقاطي" pays after the wallet, up to what is due [Owner, 2026-11-26: wallet first]', async () => {
    const [{ id: me }] = await sql<{ id: number }[]>("SELECT id FROM users WHERE phone = '01554459196'");
    await sql('UPDATE users SET wallet_balance = 50, points_balance = 1000 WHERE id = ?', [me]);
    const { cart } = await cartApi.get();
    await cartApi.edit({ cartId: cart!.id, mode: 'pickup' });
    await openCheckout();

    // 1000 points pay 100; with the wallet's 50 first, 120 is due and all 1000 go.
    expect(await screen.findByText('1000 نقطة = 100.00 ج.م')).toBeTruthy();
    await fireEvent(screen.getByRole('switch', { name: 'رصيد المحفظة' }), 'valueChange', true);
    await fireEvent(screen.getByRole('switch', { name: 'نقاطي' }), 'valueChange', true);
    expect(await screen.findByText('المدفوع بالنقاط')).toBeTruthy();
    expect(screen.getByText('-100.00 ج.م')).toBeTruthy();
    expect(screen.getAllByText('20.00 ج.م')).toHaveLength(2);

    await press('تنفيذ الطلب');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    expect(await sql('SELECT wallet_paid, points_spent, points_paid FROM orders')).toEqual([{ wallet_paid: '50.00', points_spent: 1000, points_paid: '100.00' }]);
    expect(await sql('SELECT wallet_balance, points_balance FROM users WHERE id = ?', [me])).toEqual([{ wallet_balance: '0.00', points_balance: 0 }]);
  });

  it('a pickup has no address or fee, and can be for a later time today', async () => {
    const { cart } = await cartApi.get();
    await cartApi.edit({ cartId: cart!.id, mode: 'pickup' });
    await openCheckout();
    expect(await screen.findByText('الاستلام من شاورما الساقية')).toBeTruthy();
    expect(screen.queryByText('رسوم التوصيل')).toBeNull();
    // The items total, the total and "تنفيذ الطلب 170.00 ج.م".
    expect(await screen.findAllByText('170.00 ج.م')).toHaveLength(3);

    await fireEvent.press(screen.getByRole('radio', { name: 'اختر وقتاً لاحقاً' }));
    expect(await screen.findByText('اختر وقت التوصيل')).toBeTruthy();
    const slots = deliverySlots(cairoMinute(), { opensAt: '00:00', closesAt: '00:00', closedNow: false });
    if (slots.length === 0) {
      // Too close to midnight for a later slot today.
      expect(screen.getByText('لا توجد أوقات متاحة اليوم')).toBeTruthy();
      return;
    }
    expect(screen.getByRole('button', { name: 'اختر وقتاً' }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(await screen.findByRole('radio', { name: slotLabel(slots[0]!) }));
    await press('اختر وقتاً');
    expect(await screen.findByRole('radio', { name: `موعد التوصيل ${slotLabel(slots[0]!)}` })).toBeTruthy();

    // No map for a pickup: the order goes at once.
    await press('تنفيذ الطلب');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    const [order] = await sql<{ mode: string; delivery_fee: string; scheduled_for: Date | null }[]>('SELECT mode, delivery_fee, scheduled_for FROM orders');
    expect(order).toMatchObject({ mode: 'pickup', delivery_fee: '0.00' });
    expect(order!.scheduled_for).not.toBeNull();
  });

  it('"وفر على طلبك" asks for a code first, says when one cannot be used, and takes a good one off the total', async () => {
    await sql(
      "INSERT INTO coupons (code, code_key, title, store_id, kind, value, min_order, per_customer, paid_by, active) VALUES ('Black Friday', 'black friday', 'Black Friday', ?, 'amount', 6, 150, 1, 'app', true)",
      [store],
    );
    const { cart } = await cartApi.get();
    await cartApi.edit({ cartId: cart!.id, mode: 'pickup' });
    await openCheckout();
    expect(await screen.findAllByText('170.00 ج.م')).toHaveLength(3);

    await press('تطبيق');
    expect(await screen.findByText('من فضلك أدخل الكوبون أولا')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('أدخل كود الخصم'), 'NOPE');
    await press('تطبيق');
    expect(await screen.findByText('هذا الكوبون غير صالح')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('أدخل كود الخصم'), 'black friday');
    await press('تطبيق');
    expect(await screen.findByText('خصم الكوبون')).toBeTruthy();
    expect(screen.getByText('-6.00 ج.م')).toBeTruthy();
    expect(screen.getAllByText('164.00 ج.م')).toHaveLength(2);

    await press('تنفيذ الطلب');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    expect(await sql('SELECT total, coupon_code, coupon_discount FROM orders')).toEqual([{ total: '164.00', coupon_code: 'Black Friday', coupon_discount: '6.00' }]);
  });

  it('a free delivery strikes the usual fee through and shows "مجاني"', async () => {
    await sql('UPDATE stores SET free_delivery_from = 0 WHERE id = ?', [store]);
    await openCheckout();
    expect(await screen.findByText('30.00 ج.م')).toBeTruthy();
    expect(screen.getByText('مجاني')).toBeTruthy();
    expect(screen.getAllByText('170.00 ج.م')).toHaveLength(3);
  });
});

describe('طلباتي (contract §8.8)', () => {
  it('says there are no orders yet', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer/orders' });
    expect(await screen.findByText('لا توجد طلبات')).toBeTruthy();
    expect(screen.getByText('ابدأ بطلب منتجاتك المفضلة الآن')).toBeTruthy();
  });
});

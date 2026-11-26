import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { resetChosenAddresses } from '@/features/addresses/hooks/chosen-address';
import { MapPickerScreen } from '@/features/addresses/screens/MapPickerScreen';
import { CheckoutScreen } from '@/features/checkout/screens/CheckoutScreen';
import { OrdersScreen } from '@/features/checkout/screens/OrdersScreen';
import { CustomerOrderScreen } from '@/features/orders/screens/CustomerOrderScreen';
import { RequestScreen } from '@/features/pharmacy/screens/RequestScreen';
import { StoresScreen } from '@/features/stores/screens/StoresScreen';
import { insertStore } from '../utils/catalog';
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
  'stores/[vertical]': StoresScreen,
  'pharmacy-request': RequestScreen,
  checkout: CheckoutScreen,
  'customer/orders': OrdersScreen,
  'order/[id]': CustomerOrderScreen,
  'address/map': MapPickerScreen,
};

const FAYOUM = '[{"lat":29.25,"lng":30.78},{"lat":29.36,"lng":30.78},{"lat":29.36,"lng":30.9},{"lat":29.25,"lng":30.9}]';
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let pharmacy: number;

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
  pharmacy = await insertStore('صيدلية علاجي', 'pharmacy');
  await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [zone, pharmacy]);
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('pharmacy requests (contract §8.11; real API)', () => {
  it('"روشتة طبية" opens "اختر صيدلية", and the "التالي" of a pharmacy opens "الروشتة" for it', async () => {
    await renderApp(ROUTES, { initialUrl: '/stores/pharmacy' });
    expect(await screen.findByText('سهلنا الطلب عليك')).toBeTruthy();
    expect(screen.getByText('توصيل فوري')).toBeTruthy();
    expect(screen.getByText('30 - 60 دقيقة')).toBeTruthy();
    await screen.findByRole('button', { name: 'صيدلية علاجي' });
    await press('روشتة طبية');
    expect(await screen.findByText('اختر صيدلية (1)')).toBeTruthy();
    await press('التالي صيدلية علاجي');
    expect(await screen.findByRole('header', { name: 'الروشتة' })).toBeTruthy();
    expect(screen).toHavePathname('/pharmacy-request');
    expect(screen).toHaveSearchParams({ pharmacy: String(pharmacy), kind: 'prescription' });
  });

  it('asks for a photo or a text, then pays only the fee and tells the customer the price comes later', async () => {
    await renderApp(ROUTES, { initialUrl: `/pharmacy-request?pharmacy=${pharmacy}&kind=prescription` });
    await press('التالي');
    expect(await screen.findByText('يرجى رفع صورة او كتابة طلبك')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'اختر الصورة' }));
    expect(await screen.findByRole('button', { name: 'التقط صورة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اختر من المعرض' })).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'إغلاق' })[0]!);

    await fireEvent.changeText(screen.getByPlaceholderText('مثال: علبة بنادول'), 'علبة بنادول');
    await press('التالي');
    expect(await screen.findByText('إتمام الدفع')).toBeTruthy();
    expect(await screen.findByText('سيتم إعلامك بسعر الطلب من قبل الصيدلية')).toBeTruthy();
    // No code and no points on a request [Owner, 2026-11-26]; the wallet stays.
    expect(screen.queryByText('وفر على طلبك')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'نقاطي' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'رصيد المحفظة' })).toBeTruthy();
    expect(screen.queryByText('مجموع المنتجات')).toBeNull();
    expect(await screen.findByText('رسوم التوصيل')).toBeTruthy();
    expect(screen.getAllByText('30.00 ج.م').length).toBeGreaterThan(0);

    await press('تنفيذ الطلب');
    expect(await screen.findByText('موقع التوصيل')).toBeTruthy();
    await press('تأكيد الموقع');
    expect(await screen.findByText('تم إرسال طلبك')).toBeTruthy();
    const [order] = await sql<{ id: number; request_kind: string; request_text: string; items_total: string; total: string }[]>(
      'SELECT id, request_kind, request_text, items_total, total FROM orders',
    );
    expect(order).toMatchObject({ request_kind: 'prescription', request_text: 'علبة بنادول', items_total: '0.00', total: '30.00' });
  });

  it('the order shows the request and that the price comes from the pharmacy, with no "اطلب تاني"', async () => {
    const [{ id: customer }] = await sql<{ id: number }[]>("SELECT id FROM users WHERE phone = '01554459196'");
    const res = await sql<ResultSetHeader>(
      `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, note, items_total, delivery_fee, total,
         payout_option, app_percent, app_share, store_gets, store_from_driver, request_kind, request_text)
       VALUES (?, ?, UUID(), 'rejected', 'delivery', 'شارع 2', '', 0, 30, 30, 'app_share', 10, 0, 0, 0, 'product', 'علبة بنادول')`,
      [customer, pharmacy],
    );
    await renderApp(ROUTES, { initialUrl: `/order/${res.insertId}` });
    expect(await screen.findByText('صورة المنتج')).toBeTruthy();
    expect(screen.getByText('علبة بنادول')).toBeTruthy();
    expect(screen.getByText('سيتم إعلامك بسعر الطلب من قبل الصيدلية')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'اطلب تاني' })).toBeNull();
  });
});

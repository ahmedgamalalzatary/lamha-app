import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AddressFormScreen } from '@/features/addresses/screens/AddressFormScreen';
import { MapPickerScreen } from '@/features/addresses/screens/MapPickerScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { StoresScreen } from '@/features/stores/screens/StoresScreen';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

// The native map and the phone's location have no native side under Jest. The map stand-in has two
// test buttons for what a finger does on the real map: zoom in on a spot, or pan away to one.
const mockHere = { latitude: 29.3205, longitude: 30.8364 };
type MockRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type MockNode = ReactNode;
jest.mock('react-native-maps', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = forwardRef(
    ({ onRegionChangeComplete, children }: { onRegionChangeComplete?: (r: MockRegion) => void; children?: MockNode }, ref) => {
      useImperativeHandle(ref, () => ({ animateToRegion: (r: MockRegion) => onRegionChangeComplete?.(r) }));
      const go = (latitude: number, longitude: number) => onRegionChangeComplete?.({ latitude, longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 });
      // The form's small map is not moved by hand.
      if (!onRegionChangeComplete) return <View>{children}</View>;
      return (
        <View>
          <Pressable accessibilityRole="button" accessibilityLabel="test: zoom in" onPress={() => go(29.3205, 30.8364)}>
            <Text>zoom</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="test: pan to Alexandria" onPress={() => go(31.2, 29.9)}>
            <Text>pan</Text>
          </Pressable>
          {children}
        </View>
      );
    },
  );
  return { __esModule: true, default: MapView, Marker: () => null, PROVIDER_GOOGLE: 'google' };
});
const mockPermission = { granted: false };
const mockLocation = {
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: mockPermission.granted, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => {
    mockPermission.granted = true;
    return { granted: true, canAskAgain: true };
  }),
  hasServicesEnabledAsync: jest.fn(async () => true),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: mockHere })),
  reverseGeocodeAsync: jest.fn(async () => [{ district: 'Qesm Al Fayoum', city: 'Fayoum' }]),
};
// Imports load before this file's variables, so look each function up when it is called.
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: () => mockLocation.getForegroundPermissionsAsync(),
  requestForegroundPermissionsAsync: () => mockLocation.requestForegroundPermissionsAsync(),
  hasServicesEnabledAsync: () => mockLocation.hasServicesEnabledAsync(),
  getCurrentPositionAsync: () => mockLocation.getCurrentPositionAsync(),
  reverseGeocodeAsync: () => mockLocation.reverseGeocodeAsync(),
}));
jest.mock('@/features/addresses/map-available', () => ({ mapAvailable: () => true }));

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
  'customer/index': HomeScreen,
  'stores/[vertical]': StoresScreen,
  'address/map': MapPickerScreen,
  'address/new': AddressFormScreen,
  'address/[id]': AddressFormScreen,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const FAYOUM = '[{"lat":29.25,"lng":30.78},{"lat":29.36,"lng":30.78},{"lat":29.36,"lng":30.9},{"lat":29.25,"lng":30.9}]';
let customerId: number;
let zoneId: number;

async function insertAddress(landmark: string, isDefault: boolean, over: { street?: string; building?: string; apartment?: string } = {}) {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO addresses (user_id, zone_id, type, building, apartment, street, landmark, phone, lat, lng, is_default)
     VALUES (?, ?, 'apartment', ?, ?, ?, ?, '01554459196', 29.3205, 30.8364, ?)`,
    [customerId, zoneId, over.building ?? 'مبنى', over.apartment ?? 'شقه', over.street ?? 'شارع', landmark, isDefault],
  );
  return res.insertId;
}

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  mockPermission.granted = false;
  await resetDb();
  customerId = await insertUser('customer', '01554459196');
  zoneId = (await sql<ResultSetHeader>("INSERT INTO zones (name, polygon) VALUES ('الفيوم', ?)", [FAYOUM])).insertId;
  await session.signIn(await signInAs('01554459196'));
});

// A save or delete refreshes the address list; let it land before the next test starts.
afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('addresses (contract §8.9; real API)', () => {
  it('a first address: the map waits for location or zoom, then the form needs the landmark and saves the default', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    // No saved address yet: "حدد موقعك" opens the map, which offers "تخطي".
    await fireEvent.press(await screen.findByRole('button', { name: 'التوصيل إلى حدد موقعك' }));
    expect(await screen.findByText('خدمة الموقع غير مفعّلة، يمكنك تحديد موقعك يدوياً على الخريطة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تخطي' })).toBeTruthy();
    expect(screen.getByText('قرّب الخريطة لتحديد الموقع بدقة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد الموقع' })).toBeDisabled();

    // "تفعيل" asks for the location and flies there, close enough to confirm.
    await press('تفعيل');
    expect(await screen.findByText('8RCP+6H2، Qesm Al Fayoum')).toBeTruthy();
    expect(screen.queryByText('خدمة الموقع غير مفعّلة، يمكنك تحديد موقعك يدوياً على الخريطة')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الموقع' })).toBeEnabled());
    await press('تأكيد الموقع');

    expect(await screen.findByText('عنوان جديد')).toBeTruthy();
    expect(await screen.findByText('التوصيل متاح لهذا الموقع')).toBeTruthy();
    expect(screen.getByText('يُعيَّن تلقائياً لأنه أول عنوان لك')).toBeTruthy();
    // The account's phone is filled in.
    expect(screen.getByDisplayValue('01554459196')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('رقم الشقة'), 'شقه 2');
    await press('حفظ العنوان');
    expect(await screen.findByText('يرجى إدخال علامة مميزة للعنوان')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('علامة مميزة (مثال: بجوار مسجد الرحمة)'), 'temp');
    await press('حفظ العنوان');

    // Back home, delivering to it.
    expect(await screen.findByRole('button', { name: 'التوصيل إلى temp' })).toBeTruthy();
    const rows = await sql<{ landmark: string; apartment: string; is_default: number; lat: string }[]>('SELECT landmark, apartment, is_default, lat FROM addresses');
    expect(rows).toEqual([{ landmark: 'temp', apartment: 'شقه 2', is_default: 1, lat: '29.320500' }]);
  });

  it('the saved-addresses sheet: chooses, edits and deletes', async () => {
    const home = await insertAddress('علامه', true, { street: 'شارع', building: 'مبنى', apartment: 'شقه' });
    await insertAddress('temp', false, { street: 'شارع 2', building: 'مبنى 2', apartment: 'شقه 2' });
    await renderApp(ROUTES, { initialUrl: '/customer' });

    await fireEvent.press(await screen.findByRole('button', { name: 'التوصيل إلى علامه' }));
    const sheet = await screen.findByTestId('addresses-sheet');
    expect(within(sheet).getByText('العناوين المحفوظة')).toBeTruthy();
    expect(within(sheet).getByText('شارع، مبنى، شقه - الفيوم')).toBeTruthy();
    expect(within(sheet).getByText('شارع 2، مبنى 2، شقه 2 - الفيوم')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'علامه', selected: true })).toBeTruthy();

    // Choosing another one moves the header to it.
    await fireEvent.press(within(sheet).getByRole('button', { name: 'temp' }));
    expect(await screen.findByRole('button', { name: 'التوصيل إلى temp' })).toBeTruthy();

    // "حذف" asks first, then says so.
    await fireEvent.press(screen.getByRole('button', { name: 'التوصيل إلى temp' }));
    await fireEvent.press(within(await screen.findByTestId('addresses-sheet')).getAllByRole('button', { name: 'حذف' })[1]!);
    expect(await screen.findByText('هل تريد حذف هذا العنوان؟')).toBeTruthy();
    await press('تأكيد');
    expect(await screen.findByText('تم حذف العنوان')).toBeTruthy();
    expect(await sql<{ landmark: string }[]>('SELECT landmark FROM addresses')).toEqual([{ landmark: 'علامه' }]);

    // "تعديل" opens the form filled in; moving the spot out of every zone stops the save.
    await fireEvent.press(within(await screen.findByTestId('addresses-sheet')).getByRole('button', { name: 'تعديل' }));
    expect(await screen.findByText('تعديل العنوان')).toBeTruthy();
    expect(screen.getByDisplayValue('علامه')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('الدور (اختياري)'), '3');
    await press('تعديل الموقع');
    await press('test: pan to Alexandria');
    await press('تأكيد الموقع');
    expect(await screen.findByText('التوصيل غير متاح لهذا الموقع')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ العنوان' })).toBeDisabled();
    await press('تعديل الموقع');
    await press('test: zoom in');
    await press('تأكيد الموقع');
    expect(await screen.findByText('التوصيل متاح لهذا الموقع')).toBeTruthy();
    await press('حفظ العنوان');
    await waitFor(async () => expect(await sql<{ floor: string }[]>('SELECT floor FROM addresses WHERE id = ?', [home])).toEqual([{ floor: '3' }]));
  });

  it("lists only the stores of the chosen address's zone (§8.3)", async () => {
    await insertAddress('علامه', true);
    const near = await insertStore('كشري الفيوم');
    const far = await insertStore('كشري الجيزة');
    const giza = (await sql<ResultSetHeader>("INSERT INTO zones (name, polygon) VALUES ('الجيزة', '[]')")).insertId;
    await sql('UPDATE stores SET zone_id = ? WHERE id = ?', [zoneId, near]);
    await sql('UPDATE stores SET zone_id = ? WHERE id = ?', [giza, far]);
    await renderApp(ROUTES, { initialUrl: '/stores/restaurant' });
    expect(await screen.findByText('كشري الفيوم')).toBeTruthy();
    expect(screen.queryByText('كشري الجيزة')).toBeNull();
  });
});

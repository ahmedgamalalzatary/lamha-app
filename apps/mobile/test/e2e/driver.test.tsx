import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { Vibration } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { DriverCurrentScreen } from '@/features/driver/DriverCurrentScreen';
import { DriverHomeScreen } from '@/features/driver/DriverHomeScreen';
import { DriverLive } from '@/features/driver/DriverLive';
import { DriverOrderScreen } from '@/features/driver/DriverOrderScreen';
import { DriverShiftsScreen } from '@/features/driver/DriverShiftsScreen';
import { useDriverConnected } from '@/features/driver/live';
import { insertCategory, insertMenuItem, insertStore, linkPartner } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';
import { renderApp, testQueryClient } from '../utils/render';

/** The phone's location: permission and the location service (Tawsilty asks for both first). */
const mockLocation = { granted: true, services: true };
const mockRequest = jest.fn(async () => {
  mockLocation.granted = true;
  return { granted: true, canAskAgain: true };
});
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: async () => ({ granted: mockLocation.granted, canAskAgain: true }),
  requestForegroundPermissionsAsync: () => mockRequest(),
  hasServicesEnabledAsync: async () => mockLocation.services,
  enableNetworkProviderAsync: async () => {
    mockLocation.services = true;
  },
}));

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <DriverLive />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'driver/index': DriverHomeScreen,
  'driver/current': DriverCurrentScreen,
  'driver/account': AccountScreen,
  'driver-order/[id]': DriverOrderScreen,
  'driver-shifts': DriverShiftsScreen,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
/** The popup and the card both offer the same buttons: either answers the offer. */
const pressFirst = (name: string) => fireEvent.press(screen.getAllByRole('button', { name })[0]!);

const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const clock = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAY = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' });
const DAY_OF_MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', day: 'numeric' });
/** A Cairo day from today: its index in the week (0 Sunday) and the chip's name, "الخميس 26". */
function cairoDay(offset: number) {
  const at = new Date(Date.now() + offset * 86_400_000);
  const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(WEEKDAY.format(at));
  return { index, label: `${DAY_NAMES[index]} ${DAY_OF_MONTH.format(at)}` };
}

/** The global week: every day a 4-hour shift starting this many minutes from now (negative: already started). */
async function everyDay(from: number) {
  const week = JSON.stringify(Array.from({ length: 7 }, () => ({ start: clock(from), end: clock(from + 240) })));
  await sql('INSERT INTO driver_settings (id, schedule) VALUES (1, ?) ON DUPLICATE KEY UPDATE schedule = VALUES(schedule)', [week]);
}

async function call(path: string, token: string, method = 'POST') {
  const res = await fetch(`${API_URL}${path}`, { method, headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

let store: number;
let shawarma: number;
let customer: number;
let driver: number;
let driverToken: string;
let partnerToken: string;

/** An order straight in the table: 2 × شاورما فراخ (170) + 30 delivery; the store gets 153 from the driver. */
async function insertOrder(status: string, driverId: number | null = null): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, phone, lat, lng, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver, driver_id)
     VALUES (?, ?, UUID(), ?, 'delivery', 'شارع 2، مبنى 2', '01554459196', 29.32, 30.83, '', 170, 30, 200, 'app_share', 10, 17, 153, 153, ?)`,
    [customer, store, status, driverId],
  );
  await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'شاورما فراخ', '[]', '[]', 85, 2)", [
    res.insertId,
    shawarma,
  ]);
  if (status !== 'pending_review') await sql("INSERT INTO order_events (order_id, status) VALUES (?, 'preparing')", [res.insertId]);
  return res.insertId;
}

const code = (id: number) => String(100000 + id);

beforeEach(async () => {
  mockLocation.granted = true;
  mockLocation.services = true;
  mockRequest.mockClear();
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  store = await insertStore('شاورما الساقية');
  shawarma = await insertMenuItem(store, await insertCategory(store, 'سندوتشات'), 'شاورما فراخ', 85);
  customer = await insertUser('customer', '01554459196', { firstName: 'منى', lastName: 'علي' });
  await linkPartner(await insertUser('partner', '01000000002'), store);
  partnerToken = (await signInAs('01000000002')).accessToken;
  driver = await insertUser('driver', '01000000003', { firstName: 'كريم', lastName: 'سعيد' });
  await everyDay(-10);
  const signedIn = await signInAs('01000000003');
  driverToken = signedIn.accessToken;
  await session.signIn(signedIn);
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('the delivery man\'s app (contract §10; real API and live socket)', () => {
  it('starts the shift from الرئيسية, extends it and ends it', async () => {
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText('نوبة عمل محجوزة')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'طلباتى' })).toBeTruthy();
    expect(screen.getByLabelText('الحالة: غير نشط')).toBeTruthy();
    expect(screen.getByText('لا يوجد طلبات حاليا')).toBeTruthy();
    expect(screen.getByText('ابدأ نوبة العمل لتصلك الطلبات')).toBeTruthy();

    await press('بدء نوبة العمل');
    expect(await screen.findByText('نوبة العمل الحالية')).toBeTruthy();
    expect(screen.getByLabelText('الحالة: نشط')).toBeTruthy();
    expect(screen.getByText('متبقي 3 تمديد')).toBeTruthy();
    await press('تمديد 60 دقيقة');
    expect(await screen.findByText('متبقي 2 تمديد')).toBeTruthy();

    await press('إنهاء نوبة العمل');
    expect(await screen.findByText('لن تصلك طلبات جديدة بعد الإنهاء، وتبقى طلباتك الحالية معك.')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'إنهاء نوبة العمل' }).at(-1)!);
    await waitFor(async () => {
      const [shift] = await sql<{ extensions: number; ended_at: Date | null }[]>('SELECT extensions, ended_at FROM shifts WHERE driver_id = ?', [driver]);
      expect(shift).toMatchObject({ extensions: 1, ended_at: expect.any(Date) });
    });
  });

  it('asks for the location first, as Tawsilty: تفعيل الموقع › تفعيل خدمة الموقع, then the home', async () => {
    mockLocation.granted = false;
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText('يرجى تفعيل الموقع')).toBeTruthy();
    expect(screen.queryByText('نوبة عمل محجوزة')).toBeNull();

    await press('تفعيل الموقع');
    await fireEvent.press(await screen.findByRole('button', { name: 'تفعيل خدمة الموقع' }));
    expect(await screen.findByText('نوبة عمل محجوزة')).toBeTruthy();
    expect(mockRequest).toHaveBeenCalled();
  });

  it('with the location service off, the home waits for it too', async () => {
    mockLocation.services = false;
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText('يرجى تفعيل الموقع')).toBeTruthy();
    await press('تفعيل الموقع');
    await fireEvent.press(await screen.findByRole('button', { name: 'تفعيل خدمة الموقع' }));
    expect(await screen.findByText('نوبة عمل محجوزة')).toBeTruthy();
  });

  it('late: the start button stays locked and says to ask the admin', async () => {
    await everyDay(-30);
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText('انتهى وقت بدء النوبة، تواصل مع الإدارة لبدئها')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'بدء نوبة العمل' })).toBeDisabled();
  });

  it('a new order pops up with a ring as the store accepts it; قبول takes it and opens it', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate');
    await call('/driver/shift/start', driverToken);
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText('لا يوجد طلبات حاليا')).toBeTruthy();
    await waitFor(() => expect(useDriverConnected.getState()).toBe(true));

    const id = await insertOrder('pending_review');
    await call(`/partner/orders/${id}/accept`, partnerToken);
    expect(await screen.findByText(`طلب جديد #${code(id)}`, {}, { timeout: 5000 })).toBeTruthy();
    expect(vibrate).toHaveBeenCalled();
    expect(screen.getAllByText('153.00 ج.م').length).toBeGreaterThan(0);
    expect(screen.getAllByText('تحصيل النقود').length).toBeGreaterThan(0);

    await pressFirst(`قبول #${code(id)}`);
    expect(await screen.findByText(`تفاصيل الطلب #${code(id)}`)).toBeTruthy();
    const [row] = await sql<{ driver_id: number }[]>('SELECT driver_id FROM orders WHERE id = ?', [id]);
    expect(row!.driver_id).toBe(driver);
  });

  it('"اطلب دليفري": the offer and his order show what to pick up and where (§8.12)', async () => {
    const courier = await insertStore('اطلب دليفري', 'courier');
    const service = await insertMenuItem(courier, await insertCategory(courier, 'موتوسيكل'), 'اطلب دليفري', 1);
    const note = 'استلم شنطة من محل الخياطة في شارع الحرية';
    const res = await sql<ResultSetHeader>(
      `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, phone, lat, lng, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
       VALUES (?, ?, UUID(), 'ready', 'delivery', 'شارع 2، مبنى 2', '01554459196', 29.32, 30.83, ?, 1, 30, 31, 'app_share', 10, 0.1, 0.9, 0.9)`,
      [customer, courier, note],
    );
    await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'اطلب دليفري', '[]', '[]', 1, 1)", [res.insertId, service]);
    await call('/driver/shift/start', driverToken);
    await renderApp(ROUTES, { initialUrl: '/driver' });
    expect(await screen.findByText(`طلب جديد #${code(res.insertId)}`, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getAllByText(note).length).toBeGreaterThan(0);

    await pressFirst(`قبول #${code(res.insertId)}`);
    expect(await screen.findByText(`تفاصيل الطلب #${code(res.insertId)}`)).toBeTruthy();
    expect(screen.getAllByText(note).length).toBeGreaterThan(0);
  });

  it('تخطي: a warning after 2 in a row, a block after 3', async () => {
    await call('/driver/shift/start', driverToken);
    const ids = [await insertOrder('preparing'), await insertOrder('preparing'), await insertOrder('preparing')];
    await renderApp(ROUTES, { initialUrl: '/driver' });

    await screen.findByText(`طلب جديد #${code(ids[0]!)}`);
    await pressFirst(`تخطي #${code(ids[0]!)}`);
    await screen.findByText(`طلب جديد #${code(ids[1]!)}`);
    await pressFirst(`تخطي #${code(ids[1]!)}`);
    expect(await screen.findByText('تحذير: تخطيت 2 طلبات متتالية، وسيتم إيقافك مؤقتاً إذا تخطيت المزيد')).toBeTruthy();
    await screen.findByText(`طلب جديد #${code(ids[2]!)}`);
    await pressFirst(`تخطي #${code(ids[2]!)}`);

    expect((await screen.findAllByText(/^تم إيقافك عن استقبال الطلبات حتى/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('لا يوجد طلبات حاليا')).toBeTruthy();
    const [me] = await sql<{ blocked_until: Date | null }[]>('SELECT blocked_until FROM drivers WHERE user_id = ?', [driver]);
    expect(me!.blocked_until).toEqual(expect.any(Date));
  });

  it('his order: at the store, waits for تم التجهيز, out for delivery, delivered', async () => {
    const id = await insertOrder('preparing', driver);
    await renderApp(ROUTES, { initialUrl: '/driver/current' });
    await fireEvent.press(await screen.findByRole('button', { name: `تفاصيل الطلب #${code(id)}` }));

    expect(await screen.findByText('البائع')).toBeTruthy();
    expect(screen.getByText('شاورما الساقية')).toBeTruthy();
    expect(screen.getByText('منى علي')).toBeTruthy();
    expect(screen.getByText('شارع 2، مبنى 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اتصال' })).toBeTruthy();
    expect(screen.getByText('2 منتج')).toBeTruthy();
    expect(screen.getByText('153.00 ج.م')).toBeTruthy();
    expect(screen.getByText('200.00 ج.م')).toBeTruthy();
    expect(screen.queryByText('2× شاورما فراخ')).toBeNull();
    await press('المنتجات');
    expect(screen.getByText('2× شاورما فراخ')).toBeTruthy();

    await waitFor(() => expect(useDriverConnected.getState()).toBe(true));
    await press('وصلت للمتجر');
    expect(await screen.findByText('في انتظار تجهيز الطلب من المتجر')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'خارج للتوصيل' })).toBeDisabled();
    await call(`/partner/orders/${id}/ready`, partnerToken);
    await waitFor(() => expect(screen.getByRole('button', { name: 'خارج للتوصيل' })).toBeEnabled(), { timeout: 5000 });

    await press('خارج للتوصيل');
    await fireEvent.press(await screen.findByRole('button', { name: 'تم التوصيل' }));
    await waitFor(async () => expect((await sql<{ status: string }[]>('SELECT status FROM orders WHERE id = ?', [id]))[0]!.status).toBe('delivered'));
    expect(await screen.findByText('لا يوجد طلبات حاليا')).toBeTruthy();
  });

  it('الطلبات الحالية with none: "لا يوجد طلبات حاليا" and اعادة التحميل', async () => {
    await renderApp(ROUTES, { initialUrl: '/driver/current' });
    expect(await screen.findByText('لا يوجد طلبات حاليا')).toBeTruthy();
    const id = await insertOrder('preparing', driver);
    await press('اعادة التحميل');
    expect(await screen.findByRole('button', { name: `تفاصيل الطلب #${code(id)}` })).toBeTruthy();
  });

  it('حسابي › نوبات عملي: the week\'s days with today chosen, and each day\'s shift', async () => {
    const today = cairoDay(0);
    // The strip runs Saturday to Friday: take a day of the same week.
    const other = cairoDay(today.index === 6 ? 1 : -1);
    const week: unknown[] = Array.from({ length: 7 }, () => null);
    week[today.index] = { start: clock(-10), end: clock(230) };
    await sql('UPDATE driver_settings SET schedule = ? WHERE id = 1', [JSON.stringify(week)]);

    await renderApp(ROUTES, { initialUrl: '/driver/account' });
    await fireEvent.press(await screen.findByRole('button', { name: 'نوبات عملي' }));
    expect(await screen.findByText('نوبات العمل المتوفرة')).toBeTruthy();
    expect(screen.getByRole('button', { name: today.label }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByText(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/)).toHaveLength(1);

    await press(other.label);
    expect(screen.getByText('لا توجد نوبات اليوم')).toBeTruthy();
    expect(screen.queryAllByText(/^\d{1,2}:\d{2} (AM|PM) - /)).toHaveLength(0);
  });
});

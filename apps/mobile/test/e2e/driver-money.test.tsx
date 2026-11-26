import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { DriverHistoryScreen } from '@/features/driver/DriverHistoryScreen';
import { DriverMoneyScreen } from '@/features/driver/DriverMoneyScreen';
import { DriverOrderScreen } from '@/features/driver/DriverOrderScreen';
import { DriverPointsScreen } from '@/features/driver/DriverPointsScreen';
import { TicketScreen } from '@/features/support/TicketScreen';
import { insertCategory, insertMenuItem, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

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
  'driver/account': AccountScreen,
  'driver-history': DriverHistoryScreen,
  'driver-money': DriverMoneyScreen,
  'driver-points': DriverPointsScreen,
  'driver-support/[type]': TicketScreen,
  'driver-order/[id]': DriverOrderScreen,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const code = (id: number) => String(100000 + id);

let store: number;
let shawarma: number;
let customer: number;
let driver: number;

/** One of his orders: 2 × شاورما فراخ, earning 25 when delivered, `points` speed points. */
async function insertOrder(status: string, points = 0): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, phone, lat, lng, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver, driver_id, taken_at, driver_fee, driver_points, minutes_per_km)
     VALUES (?, ?, UUID(), ?, 'delivery', 'شارع 2', '01554459196', 29.32, 30.83, '', 170, 30, 200, 'app_share', 10, 17, 153, 153, ?, UTC_TIMESTAMP(), 25, ?, 6.5)`,
    [customer, store, status, driver, points],
  );
  await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'شاورما فراخ', '[]', '[]', 85, 2)", [
    res.insertId,
    shawarma,
  ]);
  return res.insertId;
}

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  store = await insertStore('شاورما الساقية');
  shawarma = await insertMenuItem(store, await insertCategory(store, 'سندوتشات'), 'شاورما فراخ', 85);
  customer = await insertUser('customer', '01554459196', { firstName: 'منى', lastName: 'علي' });
  driver = await insertUser('driver', '01000000003', { firstName: 'كريم', lastName: 'سعيد' });
  await sql(
    `INSERT INTO driver_settings (id, schedule, speed_levels, point_value) VALUES (1, '[null,null,null,null,null,null,null]', '[{"maxMinutesPerKm":8,"points":4}]', 2.5)
     ON DUPLICATE KEY UPDATE speed_levels = VALUES(speed_levels), point_value = VALUES(point_value)`,
  );
  await session.signIn(await signInAs('01000000003'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe("the delivery man's money (contract §10; real API)", () => {
  it('حسابي shows فواتيري and نقاطي; فواتيري lists the fines and takes them off', async () => {
    const delivered = await insertOrder('delivered', 4);
    await sql("INSERT INTO driver_fines (driver_id, order_id, amount, reason) VALUES (?, ?, 5, 'تأخير في التوصيل')", [driver, delivered]);
    await renderApp(ROUTES, { initialUrl: '/driver/account' });

    // 25 earned + 4 points × 2.5 − 5 fined.
    expect(await screen.findByRole('button', { name: 'فواتيري 30.00 ج.م' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'نقاطي 4' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'نوبات عملي' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تقديم مقترح' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'التواصل معنا' })).toBeNull();

    await press('فواتيري 30.00 ج.م');
    expect(await screen.findByLabelText('صافي أرباحك 30.00 ج.م')).toBeTruthy();
    expect(screen.getByLabelText('تأخير في التوصيل، - 5.00 ج.م')).toBeTruthy();
    expect(screen.getByText(new RegExp(`الطلب #${code(delivered)}`))).toBeTruthy();
  });

  it('تقديم شكوى asks "نوع الشكوى": عامة opens the form, طلب سابق opens طلباتى', async () => {
    await renderApp(ROUTES, { initialUrl: '/driver/account' });
    await fireEvent.press(await screen.findByRole('button', { name: 'تقديم شكوى' }));
    expect(await screen.findByText('نوع الشكوى')).toBeTruthy();
    await press('عامة');
    expect(await screen.findByText('ما هو شكواك')).toBeTruthy();

    await renderApp(ROUTES, { initialUrl: '/driver/account' });
    await fireEvent.press(await screen.findByRole('button', { name: 'تقديم شكوى' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'طلب سابق' }));
    expect(await screen.findByRole('button', { name: 'بحث' })).toBeTruthy();
  });

  it('نقاطي shows the balance, its value, the levels and the orders that earned them', async () => {
    const delivered = await insertOrder('delivered', 4);
    await renderApp(ROUTES, { initialUrl: '/driver-points' });
    expect(await screen.findByLabelText('4 نقطة')).toBeTruthy();
    expect(screen.getByText('قيمتها 10.00 ج.م')).toBeTruthy();
    expect(screen.getByText('حتى 8 دقيقة لكل كم')).toBeTruthy();
    expect(screen.getByLabelText(`توصيل الطلب #${code(delivered)}، +4 نقطة`)).toBeTruthy();
  });

  it('طلباتى: the finished orders with the earning and the totals; the dates search again', async () => {
    const delivered = await insertOrder('delivered');
    const cancelled = await insertOrder('cancelled');
    await insertOrder('out_for_delivery');
    await renderApp(ROUTES, { initialUrl: '/driver-history' });

    expect(await screen.findByText(`الطلب #${code(delivered)}`)).toBeTruthy();
    expect(screen.getByText(`الطلب #${code(cancelled)}`)).toBeTruthy();
    expect(screen.getAllByText(/الطلب #/)).toHaveLength(2);
    expect(screen.getByText('ملغي')).toBeTruthy();
    expect(screen.getByText('تم التوصيل')).toBeTruthy();
    expect(screen.getAllByText('+ 25.00 ج.م')).toHaveLength(1);
    expect(screen.getAllByText('الاجمالى   2')).toHaveLength(2);
    expect(screen.getByText('اجمالى الارباح :')).toBeTruthy();
    expect(screen.getByText('25.00 ج.م')).toBeTruthy();

    // Last year, picked the wrong way round (to before from): the days swap round, and nothing this year is in them.
    const year = new Date().getFullYear() - 1;
    await fireEvent.press(screen.getByRole('button', { name: new RegExp('^من ') }));
    await fireEvent(await screen.findByTestId('history-date'), 'onValueChange', {}, new Date(year, 11, 31));
    await press('تأكيد');
    await fireEvent.press(screen.getByRole('button', { name: new RegExp('^إلى ') }));
    await fireEvent(await screen.findByTestId('history-date'), 'onValueChange', {}, new Date(year, 0, 1));
    await press('تأكيد');
    expect(screen.getByRole('button', { name: `من ${year}-12-31` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `إلى ${year}-01-01` })).toBeTruthy();
    // The list stays until بحث.
    expect(screen.getByText(`الطلب #${code(delivered)}`)).toBeTruthy();
    await press('بحث');
    expect(await screen.findByText('لا يوجد طلبات')).toBeTruthy();
    expect(screen.getByText('0.00 ج.م')).toBeTruthy();
  });

  it('starts on today, and says "لا يوجد طلبات" when the range has none', async () => {
    await renderApp(ROUTES, { initialUrl: '/driver-history' });
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    expect(await screen.findByRole('button', { name: `من ${today}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `إلى ${today}` })).toBeTruthy();
    expect(await screen.findByText('لا يوجد طلبات')).toBeTruthy();
  });

  it('a card opens the order without a step button; nothing to collect reads "مدفوعة مسبقاً"', async () => {
    const delivered = await insertOrder('delivered');
    await sql('UPDATE orders SET wallet_paid = total WHERE id = ?', [delivered]);
    await renderApp(ROUTES, { initialUrl: '/driver-history' });
    await fireEvent.press(await screen.findByRole('button', { name: `تفاصيل الطلب #${code(delivered)}` }));

    expect(await screen.findByText('البائع')).toBeTruthy();
    expect(screen.getByText('مدفوعة مسبقاً')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'تم التوصيل' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'خارج للتوصيل' })).toBeNull();
  });

  it('تقديم شكوى on a card sends a complaint about that order', async () => {
    const delivered = await insertOrder('delivered');
    await renderApp(ROUTES, { initialUrl: '/driver-history' });
    await fireEvent.press(await screen.findByRole('button', { name: `تقديم شكوى عن الطلب #${code(delivered)}` }));
    expect(await screen.findByText(`ما هو شكواك لطلب رقم ${code(delivered)}#`)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('الشكوي'), 'المحل اتأخر ساعة في التجهيز');
    await waitFor(() => expect(screen.getByRole('button', { name: 'ارسال' }).props.accessibilityState).toMatchObject({ disabled: false }));
    await press('ارسال');
    await waitFor(async () => {
      expect(await sql('SELECT type, order_id, text FROM tickets WHERE customer_id = ?', [driver])).toEqual([
        { type: 'complaint', order_id: delivered, text: 'المحل اتأخر ساعة في التجهيز' },
      ]);
    });
    expect(await screen.findByText(`الطلب #${code(delivered)}`)).toBeTruthy();
    expect(await screen.findByText('تم إرسال شكواك')).toBeTruthy();
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { NotificationSettingsScreen } from '@/features/notifications/NotificationSettingsScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { PushSetup } from '@/features/notifications/PushSetup';
import { CustomerOrderScreen } from '@/features/orders/CustomerOrderScreen';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <PushSetup />
      <ToastHost />
    </QueryClientProvider>
  );
}
function RootWithoutPush() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'customer/account': AccountScreen,
  notifications: NotificationsScreen,
  'notification-settings': NotificationSettingsScreen,
  'order/[id]': CustomerOrderScreen,
  welcome: () => null,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const TOKEN = 'ExponentPushToken[jest-device]';
let customer: number;

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  customer = await insertUser('customer', '01554459196');
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('الإشعارات and push (contract §8.14; real API)', () => {
  it('sends this phone\'s push token once signed in, and takes it back on sign-out', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    await waitFor(async () => expect(await sql('SELECT user_id, token FROM push_tokens')).toEqual([{ user_id: customer, token: TOKEN }]));

    press('تسجيل الخروج');
    fireEvent.press(await screen.findByRole('button', { name: 'تأكيد' }));
    await waitFor(async () => expect(await sql('SELECT id FROM push_tokens')).toEqual([]));
  });

  it('after a restart, before the app has asked for its token again, signing out still takes it back', async () => {
    const restarted = 'ExponentPushToken[restarted]';
    await sql('INSERT INTO push_tokens (user_id, token) VALUES (?, ?)', [customer, restarted]);
    await AsyncStorage.setItem('tawsela.pushToken', restarted);
    // No PushSetup: the token request of this start has not run.
    await renderApp({ ...ROUTES, _layout: RootWithoutPush }, { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'تسجيل الخروج' }));
    fireEvent.press(await screen.findByRole('button', { name: 'تأكيد' }));
    await waitFor(async () => expect(await sql('SELECT token FROM push_tokens')).toEqual([]));
  });

  it('the bell shows new notifications; the list opens them and marks them read; a tap opens the order', async () => {
    const store = await insertStore('بطاطس & دوريتوس');
    const order = (
      await sql<ResultSetHeader>(
        `INSERT INTO orders (customer_id, store_id, request_id, status, mode, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
         VALUES (?, ?, UUID(), 'preparing', 'delivery', '', 170, 30, 200, 'app_share', 10, 17, 153, 153)`,
        [customer, store],
      )
    ).insertId;
    await sql("INSERT INTO notifications (user_id, kind, title, body, path) VALUES (?, 'order_accepted', 'تم قبول طلبك', ?, ?)", [
      customer,
      `طلبك #${100000 + order} قيد التجهيز الآن`,
      `/order/${order}`,
    ]);
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'الإشعارات، 1 جديدة' }));

    expect(await screen.findByText(`طلبك #${100000 + order} قيد التجهيز الآن`)).toBeTruthy();
    await waitFor(async () => expect((await sql<{ r: Date | null }[]>('SELECT read_at AS r FROM notifications'))[0]!.r).not.toBeNull(), { timeout: 5000 });

    // Read now: the row no longer says "جديد".
    fireEvent.press(await screen.findByRole('button', { name: 'تم قبول طلبك' }));
    expect(await screen.findByText('قيمة الطلب')).toBeTruthy();
  });

  it('says when there is nothing yet', async () => {
    await renderApp(ROUTES, { initialUrl: '/notifications' });
    expect(await screen.findByText('لا توجد إشعارات')).toBeTruthy();
    expect(screen.getByText('ستظهر هنا إشعاراتك عند وصولها')).toBeTruthy();
  });

  it('"تفعيل الإشعار" turns the pushes off and on', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'إعدادات الإشعارات' }));
    const toggle = await screen.findByRole('switch', { name: 'تفعيل الإشعار' });
    expect(toggle.props.value).toBe(true);
    fireEvent(toggle, 'valueChange', false);
    await waitFor(async () => expect(await sql('SELECT notifications_enabled AS on_ FROM users WHERE id = ?', [customer])).toEqual([{ on_: 0 }]));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'تفعيل الإشعار' }).props.value).toBe(false));
  });
});

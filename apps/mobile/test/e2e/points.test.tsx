import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { PointsScreen } from '@/features/points/screens/PointsScreen';
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
const Opened = () => <Text>wallet opened</Text>;
const ROUTES = { _layout: Root, 'customer/index': HomeScreen, 'customer/account': AccountScreen, points: PointsScreen, wallet: Opened, welcome: () => null };
let customer: number;

/** A movement and the balance beside it, as the admin's adjustment writes them. */
async function move(kind: 'add' | 'deduct', points: number, note: string) {
  await sql("INSERT INTO points_transactions (user_id, kind, reason, points, note) VALUES (?, ?, 'admin', ?, ?)", [customer, kind, points, note]);
  await sql(`UPDATE users SET points_balance = points_balance ${kind === 'add' ? '+' : '-'} ? WHERE id = ?`, [points, customer]);
}

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

describe('نقاطي (contract §8.16; real API)', () => {
  it('starts at 0, with what is left to the minimum, the value, and both tabs empty', async () => {
    await renderApp(ROUTES, { initialUrl: '/points' });
    expect(await screen.findByText('رصيد النقاط')).toBeTruthy();
    expect(screen.getByLabelText('0 نقطة')).toBeTruthy();
    expect(screen.getByText('باقي 100 نقطة للاستبدال')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });
    expect(screen.getByText('قيمة نقاطك')).toBeTruthy();
    expect(screen.getByText('0.00 ج.م')).toBeTruthy();
    expect(screen.getByText('الحد الأدنى للاستبدال')).toBeTruthy();
    expect(screen.getByText('100 نقطة')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'المكتسبة' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('لا توجد نقاط مكتسبة')).toBeTruthy();
    expect(screen.getByText('اطلب من التطبيق واكسب نقاط مع كل طلب')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'المنفقة' }));
    expect(await screen.findByText('لا توجد نقاط منفقة')).toBeTruthy();
  });

  it('shows the balance, its value and the rows; past the minimum it says they can be spent', async () => {
    await sql('INSERT INTO points_settings (id, point_value) VALUES (1, 0.25) ON DUPLICATE KEY UPDATE point_value = 0.25');
    await move('add', 200, 'تعويض');
    await move('deduct', 40, 'خصم بالخطأ');
    await renderApp(ROUTES, { initialUrl: '/points' });
    expect(await screen.findByLabelText('160 نقطة')).toBeTruthy();
    expect(screen.getByText('40.00 ج.م')).toBeTruthy();
    expect(screen.getByText('يمكنك استبدال نقاطك الآن')).toBeTruthy();
    expect(screen.queryByText(/^باقي/)).toBeNull();

    const row = await screen.findByLabelText('تعويض، +200 نقطة');
    expect(within(row).getByText('+200 نقطة')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'المنفقة' }));
    expect(await screen.findByLabelText('خصم بالخطأ، -40 نقطة')).toBeTruthy();
  });

  it('حسابي shows نقاطي beside محفظتي and opens it', async () => {
    await move('add', 35, 'هدية');
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    expect(await screen.findByRole('button', { name: 'محفظتي 0.00 ج.م' })).toBeTruthy();
    fireEvent.press(await screen.findByRole('button', { name: 'نقاطي 35' }));
    expect(await screen.findByText('رصيد النقاط')).toBeTruthy();
  });

  it('الرئيسية: the المحفظة shortcut shows the balance and opens the wallet (L1 #1)', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    fireEvent.press(await screen.findByRole('button', { name: 'المحفظة، 0.00 ج.م' }));
    expect(await screen.findByText('wallet opened')).toBeTruthy();
  });

  it('الرئيسية: the نقاطي shortcut shows the balance and opens the points screen (L1 #1)', async () => {
    await move('add', 35, 'هدية');
    await renderApp(ROUTES, { initialUrl: '/customer' });
    fireEvent.press(await screen.findByRole('button', { name: 'نقاطي، 35 نقطة' }));
    expect(await screen.findByText('رصيد النقاط')).toBeTruthy();
  });
});

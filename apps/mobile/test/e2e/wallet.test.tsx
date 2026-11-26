import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { WalletScreen } from '@/features/wallet/screens/WalletScreen';
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
const ROUTES = { _layout: Root, 'customer/account': AccountScreen, wallet: WalletScreen, welcome: () => null };
let customer: number;

/** A movement and the balance beside it, as the admin's adjustment writes them. */
async function move(kind: 'add' | 'deduct', amount: number, note: string) {
  await sql("INSERT INTO wallet_transactions (user_id, kind, reason, amount, note) VALUES (?, ?, 'admin', ?, ?)", [customer, kind, amount, note]);
  await sql(`UPDATE users SET wallet_balance = wallet_balance ${kind === 'add' ? '+' : '-'} ? WHERE id = ?`, [amount, customer]);
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

describe('the wallet (contract §8.15; real API)', () => {
  it('starts empty on both tabs, with no top-up button [Owner: top-up excluded]', async () => {
    await renderApp(ROUTES, { initialUrl: '/wallet' });
    expect(await screen.findByText('حركة المحفظة')).toBeTruthy();
    expect(await screen.findByText('0.00 ج.م')).toBeTruthy();
    expect(screen.queryByText('شحن المحفظة')).toBeNull();
    expect(screen.getByRole('tab', { name: 'الإضافات' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('لا توجد إضافات')).toBeTruthy();
    expect(screen.getByText('لم يتم إضافة أي مبالغ للمحفظة بعد')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'الخصومات' }));
    expect(await screen.findByText('لا توجد خصومات')).toBeTruthy();
    expect(screen.getByText('لم يتم خصم أي مبالغ من المحفظة بعد')).toBeTruthy();
  });

  it('shows the balance, the additions and the deductions with their reasons', async () => {
    await move('add', 100, 'تعويض عن تأخير');
    await move('add', 50.5, 'هدية');
    await move('deduct', 25, 'خصم بالخطأ');
    await renderApp(ROUTES, { initialUrl: '/wallet' });
    expect(await screen.findByText('125.50 ج.م')).toBeTruthy();

    const added = await screen.findByLabelText('هدية، +50.50 ج.م');
    expect(within(added).getByText('+50.50 ج.م')).toBeTruthy();
    expect(screen.getByLabelText('تعويض عن تأخير، +100.00 ج.م')).toBeTruthy();
    expect(screen.queryByText('خصم بالخطأ')).toBeNull();

    fireEvent.press(screen.getByRole('tab', { name: 'الخصومات' }));
    expect(await screen.findByLabelText('خصم بالخطأ، -25.00 ج.م')).toBeTruthy();
    expect(screen.queryByText('هدية')).toBeNull();
  });

  it('حسابي shows محفظتي with the balance and opens حركة المحفظة', async () => {
    await move('add', 40, 'هدية');
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    const tile = await screen.findByRole('button', { name: 'محفظتي 40.00 ج.م' });
    fireEvent.press(tile);
    expect(await screen.findByText('حركة المحفظة')).toBeTruthy();
  });
});

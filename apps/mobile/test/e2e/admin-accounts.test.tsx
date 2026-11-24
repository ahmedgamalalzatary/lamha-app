import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Share } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountsScreen } from '@/features/accounts/screens/AccountsScreen';
import { insertStore, linkPartner } from '../utils/catalog';
import { insertUser, resetDb, signInAs } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

/** The app's root layout provides React Query; a fresh client per test keeps no cache between tests. */
let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </QueryClientProvider>
  );
}

const ROUTES = { _layout: Root, 'admin/index': AccountsScreen };

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
/** Sheets and dialogs open a moment later: wait for the button first. */
const pressWhenShown = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));
/** An account card by its first name (the test accounts all have a family name too). */
const cardOf = async (name: string) => screen.findByTestId(new RegExp(`^account-${name}`));

/** Whether this phone signs in with this password on the real API. */
const signsIn = (phone: string, password: string) =>
  signInAs(phone, password).then(
    () => true,
    () => false,
  );

let sakia: number;

beforeEach(async () => {
  client = testQueryClient();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  await insertUser('admin', '01000000001');
  sakia = await insertStore('شاورما الساقية');
  await linkPartner(await insertUser('partner', '01000000002', { firstName: 'حسن' }), sakia);
  await session.signIn(await signInAs('01000000001'));
});

describe('الحسابات: partner accounts in the admin app (contract §11.2; real API)', () => {
  it('lists partner accounts with their store, and searches', async () => {
    const koshari = await insertStore('كشري الحادقة');
    await linkPartner(await insertUser('partner', '01000000012', { firstName: 'صابر' }), koshari);
    await renderApp(ROUTES, { initialUrl: '/admin' });

    const hassan = await cardOf('حسن');
    expect(within(hassan).getByText('شاورما الساقية')).toBeTruthy();
    expect(within(hassan).getByText('01000000002')).toBeTruthy();
    expect(await cardOf('صابر')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('بحث'), 'كشري');
    await waitFor(() => {
      expect(screen.queryByTestId(/^account-حسن/)).toBeNull();
      expect(screen.getByTestId(/^account-صابر/)).toBeTruthy();
    });
  });

  it('creates an account for a store; the password is shown once, copies and signs in', async () => {
    await renderApp(ROUTES, { initialUrl: '/admin' });
    await cardOf('حسن');
    await press('إضافة حساب');

    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    await fireEvent.press(await screen.findByRole('radio', { name: 'شاورما الساقية' }));
    await fireEvent.changeText(screen.getByLabelText('الاسم الأول'), 'منى');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف'), '01554459196');
    await press('حفظ');

    const password = (await screen.findByTestId('generated-password')).props.children as string;
    expect(await signsIn('01554459196', password)).toBe(true);
    await press('نسخ');
    await waitFor(async () => expect(await Clipboard.getStringAsync()).toBe(password));
    expect(await screen.findByRole('button', { name: 'تم النسخ' })).toBeTruthy();

    await press('تم');
    expect(await cardOf('منى')).toBeTruthy();
  });

  it('says so when the stores cannot load, and retries', async () => {
    await renderApp(ROUTES, { initialUrl: '/admin' });
    await cardOf('حسن');
    const url = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:9/v1';
    try {
      await press('إضافة حساب');
      expect(await screen.findByText('تعذر الاتصال بالخادم')).toBeTruthy();
    } finally {
      process.env.EXPO_PUBLIC_API_URL = url;
    }
    await pressWhenShown('إعادة المحاولة');
    expect(await screen.findByRole('radio', { name: 'شاورما الساقية' })).toBeTruthy();
  });

  it('shares the phone and the password', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await renderApp(ROUTES, { initialUrl: '/admin' });
    await fireEvent.press(within(await cardOf('حسن')).getByRole('button', { name: 'إعادة تعيين كلمة المرور' }));
    await pressWhenShown('تأكيد');
    const password = (await screen.findByTestId('generated-password')).props.children as string;
    await pressWhenShown('مشاركة');
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining(password) });
    expect(share.mock.calls[0]![0].message).toContain('01000000002');
    expect(await signsIn('01000000002', password)).toBe(true);
  });

  it('disables an account after a confirmation', async () => {
    await renderApp(ROUTES, { initialUrl: '/admin' });
    await fireEvent.press(within(await cardOf('حسن')).getByRole('button', { name: 'إيقاف الحساب' }));
    await pressWhenShown('تأكيد');
    await waitFor(async () => expect(within(await cardOf('حسن')).getByText('موقوف')).toBeTruthy());
    expect(await signsIn('01000000002', 'secret123')).toBe(false);
  });

  it('shows the error when the phone already has an account', async () => {
    await renderApp(ROUTES, { initialUrl: '/admin' });
    await cardOf('حسن');
    await press('إضافة حساب');
    await fireEvent.press(await screen.findByRole('radio', { name: 'شاورما الساقية' }));
    await fireEvent.changeText(screen.getByLabelText('الاسم الأول'), 'منى');
    await fireEvent.changeText(screen.getByLabelText('رقم الهاتف'), '01000000002');
    await press('حفظ');
    expect(await screen.findByText('رقم الهاتف مسجل بالفعل لحساب آخر')).toBeTruthy();
  });
});

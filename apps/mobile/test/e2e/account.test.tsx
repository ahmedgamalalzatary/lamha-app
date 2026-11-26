import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, screen } from 'expo-router/testing-library';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderApp, testQueryClient } from '../utils/render';
import { Share, Text } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { ProfileScreen } from '@/features/account/screens/ProfileScreen';
import { emailedCode, insertUser, PASSWORD, refreshWorks, resetDb, signInAs, sql } from '../utils/db';

// حسابي › عناويني reads the saved addresses, so the screens need a query client, as the app's root gives them.
function Root() {
  return (
    <QueryClientProvider client={testQueryClient()}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </QueryClientProvider>
  );
}

const ROUTES = {
  _layout: Root,
  'customer/account': AccountScreen,
  'driver/account': AccountScreen,
  profile: ProfileScreen,
  welcome: () => <Text>شاشة الدخول</Text>,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(async () => {
  await session.signOutLocally();
  toast.clear();
  await resetDb();
});

/** A customer signed in through the real API. */
async function signedInCustomer() {
  await insertUser('customer', '01554459196', { email: 'ahmed@gmail.com', firstName: 'احمد', lastName: 'الزعتري' });
  const auth = await signInAs('01554459196');
  await session.signIn(auth);
  return auth;
}

describe('حسابي (contract §8.14; real API)', () => {
  it('uses the saved profile language when the device write fails', async () => {
    const { user } = await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Device storage unavailable'));
    await press('اللغة');
    await press('English');
    expect(await screen.findByRole('button', { name: 'Language' })).toBeTruthy();
    const [profile] = await sql<{ locale: string }[]>('SELECT locale FROM users WHERE id = ?', [user.id]);
    expect(profile?.locale).toBe('en');
  });

  it('switches the app and signed-in profile to English and back to Arabic', async () => {
    const { user } = await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    await press('اللغة');
    expect(screen.getByText('سيُعاد تشغيل التطبيق لتغيير اللغة.')).toBeTruthy();
    await press('English');
    expect(await screen.findByRole('button', { name: 'Language' })).toBeTruthy();
    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    const [english] = await sql<{ locale: string }[]>('SELECT locale FROM users WHERE id = ?', [user.id]);
    expect(english?.locale).toBe('en');
    expect(await AsyncStorage.getItem('tawsela.locale')).toBe('en');

    await press('Language');
    await press('العربية');
    expect(await screen.findByText('حسابي')).toBeTruthy();
    const [arabic] = await sql<{ locale: string }[]>('SELECT locale FROM users WHERE id = ?', [user.id]);
    expect(arabic?.locale).toBe('ar');
    expect(await AsyncStorage.getItem('tawsela.locale')).toBe('ar');
  });

  it('shows the name and signs out, ending the session on the server', async () => {
    const { refreshToken } = await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    await press('تسجيل الخروج');
    expect(await screen.findByText('هل أنت متأكد من تسجيل الخروج')).toBeTruthy();
    await press('تأكيد');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedOut');
    expect(await refreshWorks(refreshToken)).toBe(false);
  });

  it('"مشاركة التطبيق" under التطبيق opens the share sheet (contract §8.14)', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    await press('مشاركة التطبيق');
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('توصيلة') });
    share.mockRestore();
  });

  it('deletes a customer account after the password', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    await press('حذف الحساب');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), PASSWORD);
    const id = useSession.getState().user!.id;
    await press('تأكيد الحذف');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedOut');
    const [row] = await sql<{ phone: string; deleted_at: Date | null }[]>('SELECT phone, deleted_at FROM users WHERE id = ?', [id]);
    expect(row).toEqual({ phone: `deleted-${id}`, deleted_at: expect.any(Date) });
  });

  it('keeps the account when the password is wrong', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    await press('حذف الحساب');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'nope1234');
    await press('تأكيد الحذف');
    expect(await screen.findByText('كلمة المرور غير صحيحة')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedIn');
  });

  it('does not offer account deletion to a driver', async () => {
    await insertUser('driver', '01000000003');
    await session.signIn(await signInAs('01000000003'));
    await renderApp(ROUTES, { initialUrl: '/driver/account' });
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حذف الحساب' })).toBeNull();
  });
});

describe('الملف الشخصي (real API)', () => {
  it('shows the locked name, saves the gender, and moves the email only with the code sent to the new address (review F01)', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/profile' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'new@gmail.com');
    await fireEvent.press(screen.getByRole('radio', { name: 'ذكر' }));
    expect(screen.getByRole('radio', { name: 'ذكر' })).toBeChecked();
    await press('حفظ');

    // The gender is saved; the email waits for the code sent to the new address.
    expect(await screen.findByText('new@gmail.com')).toBeTruthy();
    expect(screen.getByText('أرسلنا رمز التحقق إلى')).toBeTruthy();
    expect(useSession.getState().user).toMatchObject({ email: 'ahmed@gmail.com', gender: 'male' });
    await fireEvent.changeText(screen.getByLabelText('رمز التحقق'), await emailedCode('01554459196', 'email'));
    await press('تأكيد');

    expect(await screen.findByText('تم تغيير البريد الإلكتروني')).toBeTruthy();
    expect(useSession.getState().user).toMatchObject({ email: 'new@gmail.com', gender: 'male' });
    const [row] = await sql<{ email: string; gender: string }[]>('SELECT email, gender FROM users WHERE phone = ?', ['01554459196']);
    expect(row).toEqual({ email: 'new@gmail.com', gender: 'male' });
  });

  it('"تغيير" moves the account to a new phone with a code sent to the email; the camera offers the two photo choices', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/profile' });

    await press('تغيير');
    expect(await screen.findByText('تغيير رقم الهاتف')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('أدخل رقم الهاتف الجديد'), '01550000001');
    await press('تأكيد رقم الهاتف');
    expect(await screen.findByText('a***d@gmail.com')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('رمز التحقق'), await emailedCode('01550000001', 'phone'));
    await press('تأكيد');

    expect(await screen.findByText('01550000001')).toBeTruthy();
    expect(useSession.getState().user?.phone).toBe('01550000001');
    await expect(signInAs('01550000001')).resolves.toBeTruthy();

    await press('تغيير الصورة');
    expect(await screen.findByText('اختر صورة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التقاط صورة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'من المعرض' })).toBeTruthy();
  });
});

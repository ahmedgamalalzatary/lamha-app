import { Stack } from 'expo-router';
import { fireEvent, screen } from 'expo-router/testing-library';
import { renderApp } from '../utils/render';
import { Text } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { ProfileScreen } from '@/features/account/screens/ProfileScreen';
import { insertUser, PASSWORD, refreshWorks, resetDb, signInAs, sql } from '../utils/db';

function Root() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </>
  );
}

const ROUTES = {
  _layout: Root,
  'customer/account': AccountScreen,
  'driver/account': AccountScreen,
  profile: ProfileScreen,
  'sign-in': () => <Text>شاشة الدخول</Text>,
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
  it('shows the name and signs out, ending the session on the server', async () => {
    const { refreshToken } = await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    await press('تسجيل الخروج');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedOut');
    expect(await refreshWorks(refreshToken)).toBe(false);
  });

  it('deletes a customer account after the password', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/customer/account' });

    await press('حذف الحساب');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), PASSWORD);
    await press('تأكيد الحذف');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedOut');
    const [row] = await sql<{ deleted_at: Date | null }[]>('SELECT deleted_at FROM users WHERE phone = ?', ['deleted-1']);
    expect(row?.deleted_at).not.toBeNull();
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
  it('shows the locked name and saves email and gender', async () => {
    await signedInCustomer();
    await renderApp(ROUTES, { initialUrl: '/profile' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'new@gmail.com');
    await fireEvent.press(screen.getByRole('radio', { name: 'ذكر' }));
    expect(screen.getByRole('radio', { name: 'ذكر' })).toBeChecked();
    await press('حفظ');

    expect(await screen.findByText('تم حفظ التغييرات')).toBeTruthy();
    expect(useSession.getState().user).toMatchObject({ email: 'new@gmail.com', gender: 'male' });
    const [row] = await sql<{ email: string; gender: string }[]>('SELECT email, gender FROM users WHERE phone = ?', ['01554459196']);
    expect(row).toEqual({ email: 'new@gmail.com', gender: 'male' });
  });
});

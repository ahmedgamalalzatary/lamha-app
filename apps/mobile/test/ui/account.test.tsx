import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { ProfileScreen } from '@/features/account/screens/ProfileScreen';
import { auth, me, mockApi } from '../utils/api-mock';

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
});

describe('حسابي (contract §8.14)', () => {
  it('shows the name and signs out', async () => {
    await session.signIn(auth('customer'));
    const api = mockApi({ 'POST /auth/logout': [204] });
    await renderRouter(ROUTES, { initialUrl: '/customer/account' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    await press('تسجيل الخروج');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(api.calls[0]).toMatchObject({ route: 'POST /auth/logout', body: { refreshToken: 'refresh-customer' } });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('deletes a customer account after the password', async () => {
    await session.signIn(auth('customer'));
    const api = mockApi({ 'DELETE /me': [204] });
    await renderRouter(ROUTES, { initialUrl: '/customer/account' });

    await press('حذف الحساب');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'secret123');
    await press('تأكيد الحذف');

    expect(await screen.findByText('شاشة الدخول')).toBeTruthy();
    expect(api.calls[0]).toMatchObject({ route: 'DELETE /me', body: { password: 'secret123' } });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('keeps the account when the password is wrong', async () => {
    await session.signIn(auth('customer'));
    mockApi({ 'DELETE /me': [403, { statusCode: 403, code: 'WRONG_PASSWORD', message: 'x' }] });
    await renderRouter(ROUTES, { initialUrl: '/customer/account' });
    await press('حذف الحساب');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'nope1234');
    await press('تأكيد الحذف');
    expect(await screen.findByText('كلمة المرور غير صحيحة')).toBeTruthy();
    expect(useSession.getState().status).toBe('signedIn');
  });

  it('does not offer account deletion to a driver', async () => {
    await session.signIn(auth('driver'));
    await renderRouter(ROUTES, { initialUrl: '/driver/account' });
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حذف الحساب' })).toBeNull();
  });
});

describe('الملف الشخصي', () => {
  it('shows the locked name and saves email and gender', async () => {
    await session.signIn(auth('customer'));
    const api = mockApi({ 'PATCH /me': (body) => [200, me({ ...(body as object) })] });
    await renderRouter(ROUTES, { initialUrl: '/profile' });

    expect(screen.getByText('احمد الزعتري')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'new@gmail.com');
    await fireEvent.press(screen.getByRole('radio', { name: 'ذكر' }));
    expect(screen.getByRole('radio', { name: 'ذكر' })).toBeChecked();
    await press('حفظ');

    expect(await screen.findByText('تم حفظ التغييرات')).toBeTruthy();
    expect(api.calls[0]?.body).toEqual({ email: 'new@gmail.com', gender: 'male' });
    expect(useSession.getState().user).toMatchObject({ email: 'new@gmail.com', gender: 'male' });
  });
});

import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session, useSession } from '@/core/auth/session';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { SignUpDetailsScreen } from '@/features/auth/screens/SignUpDetailsScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import { emailedCode, insertUser, PASSWORD, resetDb, signInAs, sql } from '../utils/db';
import { renderApp } from '../utils/render';

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
  'sign-in': SignInScreen,
  'sign-up/index': SignUpScreen,
  'sign-up/details': SignUpDetailsScreen,
  verify: VerifyCodeScreen,
  'forgot-password': ForgotPasswordScreen,
  'reset-password': ResetPasswordScreen,
  'customer/index': () => <Text>واجهة العميل</Text>,
  'partner/index': () => <Text>واجهة المورد</Text>,
};

const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const otpRows = async () => (await sql<{ n: number }[]>('SELECT COUNT(*) AS n FROM otp_codes'))[0]!.n;

beforeEach(async () => {
  await session.signOutLocally();
  toast.clear();
  await resetDb();
});

describe('sign-in (every role, contract §2; real API)', () => {
  it('signs a partner in and opens the partner tabs', async () => {
    await insertUser('partner', '01000000002');
    await renderApp(ROUTES, { initialUrl: '/sign-in' });

    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeDisabled();
    await type('رقم الهاتف', '01000000002');
    await type('كلمة المرور', PASSWORD);
    await press('تسجيل الدخول');

    expect(await screen.findByText('واجهة المورد')).toBeTruthy();
    expect(screen).toHavePathname('/partner');
    expect(useSession.getState().user).toMatchObject({ role: 'partner', phone: '01000000002' });
  });

  it('says so when the phone or password is wrong', async () => {
    await insertUser('partner', '01000000002');
    await renderApp(ROUTES, { initialUrl: '/sign-in' });
    await type('رقم الهاتف', '01000000002');
    await type('كلمة المرور', 'wrongpass');
    await press('تسجيل الدخول');
    expect(await screen.findByText('رقم الهاتف أو كلمة المرور غير صحيحة')).toBeTruthy();
  });

  it('checks the phone before calling the API', async () => {
    await renderApp(ROUTES, { initialUrl: '/sign-in' });
    await type('رقم الهاتف', '0123');
    await type('كلمة المرور', PASSWORD);
    await press('تسجيل الدخول');
    expect(screen.getByText('أدخل رقم موبايل مصري صحيح')).toBeTruthy();
  });
});

describe('sign-up (contract §8.1; real API)', () => {
  it('phone and email → emailed code → personal details → signed in as a customer', async () => {
    const friend = await insertUser('customer', '01000000007', { email: 'friend@gmail.com', inviteCode: '3JXDEB' });
    await renderApp(ROUTES, { initialUrl: '/sign-in' });

    await press('إنشاء حساب');
    await type('رقم الهاتف', '01554459196');
    await type('البريد الإلكتروني', 'Ahmed@Gmail.com');
    await press('متابعة');

    expect(await screen.findByText('رمز التحقق')).toBeTruthy();
    expect(screen.getByText('ahmed@gmail.com')).toBeTruthy();
    expect(screen.getByText('00:59')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد' })).toBeDisabled();
    await type('رمز التحقق', await emailedCode('01554459196', 'signup'));
    await press('تأكيد');

    expect(await screen.findByText('التفاصيل الشخصية')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    await type('الاسم الأول', 'احمد');
    await type('اسم العائلة', 'الزعتري');
    await type('كلمة المرور', 'secret123');
    await type('رمز الدعوة (اختياري)', '3jxdeb');
    await press('متابعة');

    expect(await screen.findByText('واجهة العميل')).toBeTruthy();
    const [row] = await sql<{ email: string; first_name: string; invited_by_id: number }[]>(
      'SELECT email, first_name, invited_by_id FROM users WHERE phone = ?',
      ['01554459196'],
    );
    expect(row).toEqual({ email: 'ahmed@gmail.com', first_name: 'احمد', invited_by_id: friend });
    await expect(signInAs('01554459196', 'secret123')).resolves.toBeTruthy();
  });

  it('keeps only the digits of the code', async () => {
    await renderApp(ROUTES, { initialUrl: '/verify?purpose=signup&phone=01554459196&email=a%40b.co' });
    await type('رمز التحقق', '12a34');
    expect(screen.getByRole('button', { name: 'تأكيد' })).toBeEnabled();
  });

  it('tells a known phone to sign in instead', async () => {
    await insertUser('customer', '01554459196', { email: 'ahmed@gmail.com' });
    await renderApp(ROUTES, { initialUrl: '/sign-up' });
    await type('رقم الهاتف', '01554459196');
    await type('البريد الإلكتروني', 'new@gmail.com');
    await press('متابعة');
    expect(await screen.findByText('رقم الهاتف مسجل بالفعل، سجّل الدخول')).toBeTruthy();
  });

  it('shows the wrong-code message with the tries left', async () => {
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/signup/code`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '01554459196', email: 'a@b.co' }),
    });
    const wrong = (await emailedCode('01554459196', 'signup')) === '9999' ? '1111' : '9999';
    await renderApp(ROUTES, { initialUrl: '/verify?purpose=signup&phone=01554459196&email=a%40b.co' });
    await type('رمز التحقق', wrong);
    await press('تأكيد');
    expect(await screen.findByText('الرمز غير صحيح، متبقي 4 محاولات')).toBeTruthy();
  });

  it('offers a new code once the 00:59 countdown ends, and sends it', async () => {
    // renderRouter keeps the fake timers on, to run the countdown.
    await renderRouter(ROUTES, { initialUrl: '/verify?purpose=signup&phone=01554459196&email=a%40b.co' });
    expect(screen.queryByRole('button', { name: 'إعادة إرسال الرمز' })).toBeNull();
    await act(() => jest.advanceTimersByTime(59_000));
    // The request itself runs on real timers.
    jest.useRealTimers();
    await press('إعادة إرسال الرمز');
    await waitFor(async () => expect(await otpRows()).toBe(1));
  });

  it('refuses a short password on the details screen', async () => {
    await renderApp(ROUTES, { initialUrl: '/sign-up/details?ticket=T1&phone=01554459196&email=a%40b.co' });
    await type('الاسم الأول', 'احمد');
    await type('اسم العائلة', 'الزعتري');
    await type('كلمة المرور', '1234567');
    await press('متابعة');
    expect(screen.getByText('8 خانات على الأقل (حروف أو أرقام أو رموز)')).toBeTruthy();
  });
});

describe('forgot password (real API)', () => {
  it('sends the code to the masked email and sets the new password', async () => {
    await insertUser('customer', '01554459196', { email: 'ahmed@gmail.com' });
    await renderApp(ROUTES, { initialUrl: '/sign-in' });
    await press('نسيت كلمة المرور؟');
    await type('رقم الهاتف', '01554459196');
    await press('إرسال الرمز');
    expect(await screen.findByText('a***d@gmail.com')).toBeTruthy();
    await type('رمز التحقق', await emailedCode('01554459196', 'reset'));
    await press('تأكيد');
    expect(await screen.findByText('كلمة مرور جديدة')).toBeTruthy();
    await type('كلمة المرور', 'newpass99');
    await press('حفظ');
    expect(await screen.findByText('واجهة العميل')).toBeTruthy();
    await expect(signInAs('01554459196', 'newpass99')).resolves.toBeTruthy();
  });

  it('tells partners and drivers to ask the admin', async () => {
    await insertUser('partner', '01000000002');
    await renderApp(ROUTES, { initialUrl: '/forgot-password' });
    await type('رقم الهاتف', '01000000002');
    await press('إرسال الرمز');
    await waitFor(() => expect(screen.getByText('تواصل مع الإدارة لإعادة تعيين كلمة المرور')).toBeTruthy());
  });
});

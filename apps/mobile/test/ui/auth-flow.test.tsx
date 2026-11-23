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
import { auth, mockApi } from '../utils/api-mock';

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

beforeEach(async () => {
  await session.signOutLocally();
  toast.clear();
});

describe('sign-in (every role, contract §2)', () => {
  it('signs a partner in and opens the partner tabs', async () => {
    const api = mockApi({ 'POST /auth/login': [201, auth('partner')] });
    await renderRouter(ROUTES, { initialUrl: '/sign-in' });

    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeDisabled();
    await type('رقم الهاتف', '01000000002');
    await type('كلمة المرور', 'secret123');
    await press('تسجيل الدخول');

    expect(await screen.findByText('واجهة المورد')).toBeTruthy();
    expect(screen).toHavePathname('/partner');
    expect(api.calls[0]?.body).toEqual({ phone: '01000000002', password: 'secret123' });
    expect(useSession.getState().user?.role).toBe('partner');
  });

  it('says so when the phone or password is wrong', async () => {
    mockApi({ 'POST /auth/login': [401, { statusCode: 401, code: 'BAD_CREDENTIALS', message: 'x' }] });
    await renderRouter(ROUTES, { initialUrl: '/sign-in' });
    await type('رقم الهاتف', '01000000002');
    await type('كلمة المرور', 'wrongpass');
    await press('تسجيل الدخول');
    expect(await screen.findByText('رقم الهاتف أو كلمة المرور غير صحيحة')).toBeTruthy();
  });

  it('checks the phone before calling the API', async () => {
    const api = mockApi({});
    await renderRouter(ROUTES, { initialUrl: '/sign-in' });
    await type('رقم الهاتف', '0123');
    await type('كلمة المرور', 'secret123');
    await press('تسجيل الدخول');
    expect(screen.getByText('أدخل رقم موبايل مصري صحيح')).toBeTruthy();
    expect(api.calls).toHaveLength(0);
  });
});

describe('sign-up (contract §8.1)', () => {
  it('phone and email → code → personal details → signed in as a customer', async () => {
    const api = mockApi({
      'POST /auth/signup/code': [201, { email: 'ahmed@gmail.com', resendIn: 59 }],
      'POST /auth/code/verify': [201, { ticket: 'T1' }],
      'POST /auth/signup': [201, auth('customer')],
    });
    await renderRouter(ROUTES, { initialUrl: '/sign-in' });

    await press('إنشاء حساب');
    await type('رقم الهاتف', '01554459196');
    await type('البريد الإلكتروني', 'Ahmed@Gmail.com');
    await press('متابعة');

    expect(await screen.findByText('رمز التحقق')).toBeTruthy();
    expect(screen.getByText('ahmed@gmail.com')).toBeTruthy();
    expect(screen.getByText('00:59')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد' })).toBeDisabled();
    await type('رمز التحقق', '12a34');
    expect(screen.getByRole('button', { name: 'تأكيد' })).toBeEnabled();
    await press('تأكيد');

    expect(await screen.findByText('التفاصيل الشخصية')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    await type('الاسم الأول', 'احمد');
    await type('اسم العائلة', 'الزعتري');
    await type('كلمة المرور', 'secret123');
    await type('رمز الدعوة (اختياري)', '3jxdeb');
    await press('متابعة');

    expect(await screen.findByText('واجهة العميل')).toBeTruthy();
    expect(api.calls.map((c) => c.route)).toEqual(['POST /auth/signup/code', 'POST /auth/code/verify', 'POST /auth/signup']);
    expect(api.calls[0]?.body).toEqual({ phone: '01554459196', email: 'ahmed@gmail.com' });
    expect(api.calls[1]?.body).toEqual({ phone: '01554459196', purpose: 'signup', code: '1234' });
    expect(api.calls[2]?.body).toEqual({
      ticket: 'T1',
      firstName: 'احمد',
      lastName: 'الزعتري',
      password: 'secret123',
      inviteCode: '3JXDEB',
    });
  });

  it('tells a known phone to sign in instead', async () => {
    mockApi({ 'POST /auth/signup/code': [409, { statusCode: 409, code: 'PHONE_TAKEN', message: 'x' }] });
    await renderRouter(ROUTES, { initialUrl: '/sign-up' });
    await type('رقم الهاتف', '01554459196');
    await type('البريد الإلكتروني', 'ahmed@gmail.com');
    await press('متابعة');
    expect(await screen.findByText('رقم الهاتف مسجل بالفعل، سجّل الدخول')).toBeTruthy();
  });

  it('shows the wrong-code message with the tries left', async () => {
    mockApi({ 'POST /auth/code/verify': [400, { statusCode: 400, code: 'OTP_WRONG', message: 'x', triesLeft: 2 }] });
    await renderRouter(ROUTES, { initialUrl: '/verify?purpose=signup&phone=01554459196&email=a%40b.co' });
    await type('رمز التحقق', '9999');
    await press('تأكيد');
    expect(await screen.findByText('الرمز غير صحيح، متبقي 2 محاولات')).toBeTruthy();
  });

  it('offers a new code once the 00:59 countdown ends', async () => {
    jest.useFakeTimers();
    const api = mockApi({ 'POST /auth/signup/code': [201, { email: 'a@b.co', resendIn: 59 }] });
    await renderRouter(ROUTES, { initialUrl: '/verify?purpose=signup&phone=01554459196&email=a%40b.co' });
    expect(screen.queryByRole('button', { name: 'إعادة إرسال الرمز' })).toBeNull();
    await act(() => jest.advanceTimersByTime(59_000));
    await press('إعادة إرسال الرمز');
    expect(api.calls[0]).toMatchObject({ route: 'POST /auth/signup/code', body: { phone: '01554459196', email: 'a@b.co' } });
    jest.useRealTimers();
  });

  it('refuses a short password on the details screen', async () => {
    const api = mockApi({});
    await renderRouter(ROUTES, { initialUrl: '/sign-up/details?ticket=T1&phone=01554459196&email=a%40b.co' });
    await type('الاسم الأول', 'احمد');
    await type('اسم العائلة', 'الزعتري');
    await type('كلمة المرور', '1234567');
    await press('متابعة');
    expect(screen.getByText('8 خانات على الأقل (حروف أو أرقام أو رموز)')).toBeTruthy();
    expect(api.calls).toHaveLength(0);
  });
});

describe('forgot password', () => {
  it('sends the code to the masked email and sets the new password', async () => {
    const api = mockApi({
      'POST /auth/password/code': [201, { email: 'a***d@gmail.com', resendIn: 59 }],
      'POST /auth/code/verify': [201, { ticket: 'R1' }],
      'POST /auth/password/reset': [201, auth('customer')],
    });
    await renderRouter(ROUTES, { initialUrl: '/sign-in' });
    await press('نسيت كلمة المرور؟');
    await type('رقم الهاتف', '01554459196');
    await press('إرسال الرمز');
    expect(await screen.findByText('a***d@gmail.com')).toBeTruthy();
    await type('رمز التحقق', '4321');
    await press('تأكيد');
    expect(await screen.findByText('كلمة مرور جديدة')).toBeTruthy();
    await type('كلمة المرور', 'newpass99');
    await press('حفظ');
    expect(await screen.findByText('واجهة العميل')).toBeTruthy();
    expect(api.calls[2]?.body).toEqual({ ticket: 'R1', password: 'newpass99' });
  });

  it('tells partners and drivers to ask the admin', async () => {
    mockApi({ 'POST /auth/password/code': [403, { statusCode: 403, code: 'STAFF_RESET_BY_ADMIN', message: 'x' }] });
    await renderRouter(ROUTES, { initialUrl: '/forgot-password' });
    await type('رقم الهاتف', '01000000002');
    await press('إرسال الرمز');
    await waitFor(() => expect(screen.getByText('تواصل مع الإدارة لإعادة تعيين كلمة المرور')).toBeTruthy());
  });
});

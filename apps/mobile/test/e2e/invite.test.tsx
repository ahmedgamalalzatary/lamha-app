import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Linking, Share } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { InviteScreen } from '@/features/invite/InviteScreen';
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
const ROUTES = { _layout: Root, 'customer/index': HomeScreen, 'customer/account': AccountScreen, invite: InviteScreen, welcome: () => null };
let customer: number;

/** A friend who signed up with the customer's code, as sign-up records it. */
async function friend(phone: string, firstName: string, status: 'waiting' | 'rewarded', reward = 0) {
  const id = await insertUser('customer', phone);
  await sql('UPDATE users SET first_name = ? WHERE id = ?', [firstName, id]);
  await sql('INSERT INTO invites (inviter_id, friend_id, status, reward, rewarded_at) VALUES (?, ?, ?, ?, ?)', [
    customer,
    id,
    status,
    reward,
    status === 'rewarded' ? new Date() : null,
  ]);
}

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  customer = await insertUser('customer', '01554459196');
  await sql("UPDATE users SET invite_code = '3JXDEB' WHERE id = ?", [customer]);
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  jest.restoreAllMocks();
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('ادعُ أصدقاءك (contract §8.17; real API)', () => {
  it('shows the code, the rewards, the rules from the admin\'s settings, and no friends yet', async () => {
    await renderApp(ROUTES, { initialUrl: '/invite' });
    expect(await screen.findByText('ادعُ أصدقاءك واحصل على 300 ج.م')).toBeTruthy();
    expect(screen.getByText('يحصل صديقك على 25 ج.م في محفظته.')).toBeTruthy();
    expect(screen.getByText('3JXDEB')).toBeTruthy();
    expect(screen.getByLabelText('ربحت 0 ج.م')).toBeTruthy();
    expect(screen.getByLabelText('رصيدك المتاح 0 ج.م')).toBeTruthy();
    expect(screen.getByText('كيف تعمل الدعوة؟')).toBeTruthy();
    expect(screen.getByText('• مكافأتك: 300 ج.م — بحد أقصى 30 ج.م في الطلب الواحد، وصالحة 30 يومًا من إضافتها.')).toBeTruthy();
    expect(screen.getByText('• رصيد صديقك: 25 ج.م — صالح 30 يومًا من إضافته.')).toBeTruthy();
    expect(screen.getByText('• يجب أن يستلم صديقك أول طلب خلال 30 يومًا من تسجيله.')).toBeTruthy();
    expect(screen.getByText('متبقٍ لك 1000 مكافآت هذا الشهر.')).toBeTruthy();
    expect(screen.getByText('لم يسجّل أحد برمزك بعد')).toBeTruthy();
  });

  it('leaves the days out of the rules when invite money does not expire [Owner: a switch]', async () => {
    await sql('INSERT INTO invite_settings (id, reward, expires) VALUES (1, 50, false) ON DUPLICATE KEY UPDATE reward = 50, expires = false');
    await renderApp(ROUTES, { initialUrl: '/invite' });
    expect(await screen.findByText('• مكافأتك: 50 ج.م — بحد أقصى 30 ج.م في الطلب الواحد.')).toBeTruthy();
    expect(screen.getByText('• رصيد صديقك: 25 ج.م.')).toBeTruthy();
  });

  it('lists the friends who joined, with what each brought', async () => {
    await friend('01011111111', 'كريم', 'rewarded', 300);
    await friend('01022222222', 'سامح', 'waiting');
    await renderApp(ROUTES, { initialUrl: '/invite' });
    expect(await screen.findByLabelText('ربحت 300 ج.م')).toBeTruthy();
    expect(screen.getByText('متبقٍ لك 700 مكافآت هذا الشهر.')).toBeTruthy();
    expect(within(screen.getByLabelText(/^كريم/)).getByText('ربحت 300 ج.م')).toBeTruthy();
    expect(within(screen.getByLabelText(/^سامح/)).getByText('بانتظار أول طلب')).toBeTruthy();
  });

  it('copies the code, shares it, and opens WhatsApp with it', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderApp(ROUTES, { initialUrl: '/invite' });
    await screen.findByText('3JXDEB');

    await fireEvent.press(screen.getByRole('button', { name: 'نسخ' }));
    await waitFor(async () => expect(await Clipboard.getStringAsync()).toBe('3JXDEB'));
    expect(await screen.findByText('تم نسخ الرمز')).toBeTruthy();

    const message = 'استخدم رمز دعوتي 3JXDEB عند التسجيل في توصيلة واحصل على 25 ج.م في محفظتك.';
    await fireEvent.press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(share).toHaveBeenCalledWith({ message });
    await fireEvent.press(screen.getByRole('button', { name: 'واتساب' }));
    expect(open).toHaveBeenCalledWith(`whatsapp://send?text=${encodeURIComponent(message)}`);
  });

  it('حسابي shows the invite card with the code; it opens ادعُ أصدقاءك', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer/account' });
    expect(await screen.findByText('اربح 300 ج.م عن كل صديق')).toBeTruthy();
    expect(screen.getByText('وصديقك يحصل على 25 ج.م فور تسجيله')).toBeTruthy();
    expect(screen.getByText('3JXDEB')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'ادعُ أصدقاءك' }));
    expect(await screen.findByText('كيف تعمل الدعوة؟')).toBeTruthy();
  });

  it('الرئيسية: the invite card opens ادعُ أصدقاءك', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    await fireEvent.press(await screen.findByRole('button', { name: 'ادعُ أصدقاءك' }));
    expect(await screen.findByText('كيف تعمل الدعوة؟')).toBeTruthy();
  });
});

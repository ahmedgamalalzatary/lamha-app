import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { Linking } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { OrdersScreen } from '@/features/checkout/screens/OrdersScreen';
import { CustomerOrderScreen } from '@/features/orders/screens/CustomerOrderScreen';
import { RatePrompt } from '@/features/support/components/RatePrompt';
import { RatingScreen } from '@/features/support/screens/RatingScreen';
import { PickOrderScreen } from '@/features/support/screens/PickOrderScreen';
import { TicketScreen } from '@/features/support/screens/TicketScreen';
import { insertProduct, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root({ prompt }: { prompt: boolean }) {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      {prompt ? <RatePrompt /> : null}
      <ToastHost />
    </QueryClientProvider>
  );
}
const routes = (prompt = false) => ({
  _layout: () => <Root prompt={prompt} />,
  'customer/orders': OrdersScreen,
  'customer/account': AccountScreen,
  'order/[id]': CustomerOrderScreen,
  'rate/[id]': RatingScreen,
  'support/[type]': TicketScreen,
  'support-orders': PickOrderScreen,
});

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let customer: number;
let store: number;
let product: number;

async function insertOrder(status = 'delivered'): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
     VALUES (?, ?, UUID(), ?, 'delivery', 'شارع 2', '', 170, 30, 200, 'app_share', 10, 17, 153, 153)`,
    [customer, store, status],
  );
  await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'شاورما فراخ', '[]', '[]', 85, 2)", [
    res.insertId,
    product,
  ]);
  return res.insertId;
}

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  customer = await insertUser('customer', '01554459196');
  store = await insertStore('بطاطس & دوريتوس');
  product = await insertProduct(store, 'شاورما فراخ', 85);
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('rating a delivered order (contract §8.8; real API)', () => {
  it('opens by itself when the app opens; a low rating needs a reason before "أكمل"', async () => {
    const id = await insertOrder();
    await renderApp(routes(true), { initialUrl: '/customer/orders' });

    expect(await screen.findByText('كيف كان طلبك من بطاطس & دوريتوس؟')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'أكمل' }).props.accessibilityState).toMatchObject({ disabled: true });
    press('1 من 5');
    expect(await screen.findByText('مخيبة للآمال')).toBeTruthy();
    expect(screen.getByText('ما هي المشكلة التي واجهتها مع طلبك؟')).toBeTruthy();
    expect(screen.getByText('اختر سبب واحد على الأقل')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'أكمل' }).props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(screen.getByRole('checkbox', { name: 'عنصر مفقود' }));
    await waitFor(() => expect(screen.queryByText('اختر سبب واحد على الأقل')).toBeNull());
    fireEvent.changeText(screen.getByLabelText('أخبرنا المزيد'), 'ناقص البطاطس');
    await waitFor(() => expect(screen.getByRole('button', { name: 'أكمل' }).props.accessibilityState).toMatchObject({ disabled: false }));
    press('أكمل');

    expect(await screen.findByText('شكراً لتقييمك')).toBeTruthy();
    expect(await sql('SELECT stars, tags, text FROM ratings WHERE order_id = ?', [id])).toEqual([{ stars: 1, tags: ['missing_item'], text: 'ناقص البطاطس' }]);
  });

  it('✕ stops the popup for that order; "قيّم طلبك" in the details still rates it, a good rating with no chip', async () => {
    const id = await insertOrder();
    await renderApp(routes(true), { initialUrl: '/customer/orders' });
    await screen.findByText('كيف كان طلبك من بطاطس & دوريتوس؟');
    press('إغلاق');
    await waitFor(async () => expect((await sql<{ s: Date | null }[]>('SELECT rating_skipped_at AS s FROM orders WHERE id = ?', [id]))[0]!.s).not.toBeNull());

    fireEvent.press(await screen.findByRole('button', { name: `طلب رقم #${100000 + id}` }));
    fireEvent.press(await screen.findByRole('button', { name: 'قيّم طلبك' }));
    await screen.findByText('كيف كان طلبك من بطاطس & دوريتوس؟');
    press('5 من 5');
    expect(await screen.findByText('ممتازة')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'المذاق رائع' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'عنصر مفقود' })).toBeNull();
    press('أكمل');

    expect(await screen.findByLabelText('تقييمك 5 من 5')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'قيّم طلبك' })).toBeNull();
  });
});

describe('الدعم والمساعدة (contract §8.14; real API)', () => {
  it('a general complaint: تقديم شكوى › عامة, then the form', async () => {
    await renderApp(routes(), { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'تقديم شكوى' }));
    expect(await screen.findByText('نوع الشكوى')).toBeTruthy();
    press('عامة');

    expect(await screen.findByText('ما هو شكواك')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ارسال' }).props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(screen.getByLabelText('الشكوي'), 'التطبيق بطيء');
    await waitFor(() => expect(screen.getByRole('button', { name: 'ارسال' }).props.accessibilityState).toMatchObject({ disabled: false }));
    press('ارسال');
    expect(await screen.findByText('تم إرسال شكواك')).toBeTruthy();
    expect(await sql('SELECT type, order_id, text FROM tickets')).toEqual([{ type: 'complaint', order_id: null, text: 'التطبيق بطيء' }]);
  });

  it('a complaint about a past order: طلب سابق picks it from طلباتي', async () => {
    const id = await insertOrder();
    await renderApp(routes(), { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'تقديم شكوى' }));
    fireEvent.press(await screen.findByRole('button', { name: 'طلب سابق' }));
    fireEvent.press(await screen.findByRole('button', { name: `طلب رقم #${100000 + id}` }));

    expect(await screen.findByText(`ما هو شكواك لطلب رقم ${100000 + id}#`)).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('الشكوي'), 'وصل بارد');
    await waitFor(() => expect(screen.getByRole('button', { name: 'ارسال' }).props.accessibilityState).toMatchObject({ disabled: false }));
    press('ارسال');
    expect(await screen.findByText('تم إرسال شكواك')).toBeTruthy();
    expect(await sql('SELECT type, order_id FROM tickets')).toEqual([{ type: 'complaint', order_id: id }]);
  });

  it('"تواصل مع الدعم الفني" in an order\'s details opens a complaint about it', async () => {
    const id = await insertOrder();
    await renderApp(routes(), { initialUrl: `/order/${id}` });
    fireEvent.press(await screen.findByRole('button', { name: 'تواصل مع الدعم الفني' }));
    expect(await screen.findByText(`ما هو شكواك لطلب رقم ${100000 + id}#`)).toBeTruthy();
  });

  it('a suggestion: تقديم مقترح, then the form', async () => {
    await renderApp(routes(), { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'تقديم مقترح' }));
    expect(await screen.findByText('ما هو اقتراحك')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('الاقتراح'), 'ضيفوا الدفع بالفيزا');
    await waitFor(() => expect(screen.getByRole('button', { name: 'ارسال' }).props.accessibilityState).toMatchObject({ disabled: false }));
    press('ارسال');
    expect(await screen.findByText('تم إرسال اقتراحك')).toBeTruthy();
    expect(await sql('SELECT type, text FROM tickets')).toEqual([{ type: 'suggestion', text: 'ضيفوا الدفع بالفيزا' }]);
  });

  it('"التواصل معنا" lists the admin\'s numbers and calls one', async () => {
    await sql("INSERT INTO support_phones (label, phone, sort_order) VALUES ('هاتف 1', '01021846434', 0)");
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderApp(routes(), { initialUrl: '/customer/account' });
    fireEvent.press(await screen.findByRole('button', { name: 'التواصل معنا' }));
    const row = await screen.findByRole('button', { name: 'هاتف 1 01021846434' });
    expect(within(row).getByText('01021846434')).toBeTruthy();
    fireEvent.press(row);
    expect(open).toHaveBeenCalledWith('tel:01021846434');
    open.mockRestore();
  });
});

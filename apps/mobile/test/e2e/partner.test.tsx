import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { Vibration } from 'react-native';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { PartnerHomeScreen } from '@/features/partner/PartnerHomeScreen';
import { PartnerLive } from '@/features/partner/PartnerLive';
import { PartnerOrderScreen } from '@/features/partner/PartnerOrderScreen';
import { PartnerOrdersScreen } from '@/features/partner/PartnerOrdersScreen';
import { PartnerProductsScreen } from '@/features/partner/PartnerProductsScreen';
import { insertCategory, insertMenuItem, insertStore } from '../utils/catalog';
import { insertUser, PASSWORD, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <PartnerLive />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'partner/index': PartnerHomeScreen,
  'partner/orders': PartnerOrdersScreen,
  'partner/products': PartnerProductsScreen,
  'partner/account': AccountScreen,
  'partner-order/[id]': PartnerOrderScreen,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let store: number;
let shawarma: number;
let customer: number;

/** The customer orders 2 × شاورما فراخ (85) for pickup through the real API, as their phone does. */
async function placePickup(): Promise<number> {
  const call = async (path: string, method: string, token: string | null, body?: unknown) => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };
  const { accessToken } = await call('/auth/login', 'POST', null, { phone: '01554459196', password: PASSWORD });
  await call('/me/cart/lines', 'POST', accessToken, { productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] });
  const { cart } = await call('/me/cart', 'GET', accessToken);
  await call('/me/cart', 'PATCH', accessToken, { cartId: cart.id, mode: 'pickup', note: '01021327197 ده رقم الاستلام' });
  const bill = await call('/me/checkout/quote', 'POST', accessToken, {});
  const requestId = `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`;
  const { order } = await call('/me/orders', 'POST', accessToken, { cartId: bill.cartId, slot: null, expectedTotal: bill.total, requestId });
  return order.id;
}

/** An order straight in the table, at a status the test needs. */
async function insertOrder(status: string, mode = 'delivery'): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, phone, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
     VALUES (?, ?, UUID(), ?, ?, 'شارع 2، مبنى 2', '01554459196', '', 170, 30, 200, 'app_share', 10, 17, 153, 153)`,
    [customer, store, status, mode],
  );
  await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'شاورما فراخ', '[]', '[]', 85, 2)", [
    res.insertId,
    shawarma,
  ]);
  return res.insertId;
}

const statusOf = async (id: number) => (await sql<{ status: string }[]>('SELECT status FROM orders WHERE id = ?', [id]))[0]!.status;

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  store = await insertStore('شاورما الساقية', 'restaurant', { pickupAllowed: true });
  const sandwiches = await insertCategory(store, 'سندوتشات');
  shawarma = await insertMenuItem(store, sandwiches, 'شاورما فراخ', 85);
  await insertMenuItem(store, await insertCategory(store, 'مشروبات', 1), 'كولا', 15);
  customer = await insertUser('customer', '01554459196', { firstName: 'منى', lastName: 'علي' });
  const partner = await insertUser('partner', '01000000002');
  await sql('UPDATE users SET store_id = ? WHERE id = ?', [store, partner]);
  await session.signIn(await signInAs('01000000002'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('the partner app (contract §9; real API and live socket)', () => {
  it('a new order rings and pops up as it arrives; قبول starts preparing it', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate');
    await renderApp(ROUTES, { initialUrl: '/partner' });
    expect(await screen.findByText('الطلبات الجديده')).toBeTruthy();
    expect(await screen.findByText('لا توجد طلبات جديدة')).toBeTruthy();
    await screen.findByLabelText('متصل');

    const id = await placePickup();
    expect(await screen.findByText(`طلب رقم # ${100000 + id}`, {}, { timeout: 5000 })).toBeTruthy();
    expect(vibrate).toHaveBeenCalled();
    expect(screen.getByText('هل تريد قبول أو رفض الطلب ?')).toBeTruthy();
    expect(screen.getAllByText('01021327197 ده رقم الاستلام').length).toBeGreaterThan(0);
    expect(screen.getByText('المنتجات 1')).toBeTruthy();
    expect(screen.getByText('2 عناصر')).toBeTruthy();
    expect(screen.getByText('الدفع عند الاستلام')).toBeTruthy();
    // The card under the popup.
    expect(screen.getByText(`#${100000 + id} - قيد المراجعة`)).toBeTruthy();

    await press('قبول');
    await waitFor(async () => expect(await statusOf(id)).toBe('preparing'));
    expect(await screen.findByText('لا توجد طلبات جديدة')).toBeTruthy();
    expect(screen.queryByText('هل تريد قبول أو رفض الطلب ?')).toBeNull();
  });

  it('on an iPhone, which has no back button, ✕ leaves the popup for later (jest runs as iOS)', async () => {
    const id = await placePickup();
    await renderApp(ROUTES, { initialUrl: '/partner' });
    expect(await screen.findByText(`طلب رقم # ${100000 + id}`)).toBeTruthy();
    await press('لاحقاً');
    await waitFor(() => expect(screen.queryByText(`طلب رقم # ${100000 + id}`)).toBeNull());
    expect(await statusOf(id)).toBe('pending_review');
  });

  it('رفض refuses an order waiting when the app opens', async () => {
    const id = await placePickup();
    await renderApp(ROUTES, { initialUrl: '/partner' });
    expect(await screen.findByText(`طلب رقم # ${100000 + id}`)).toBeTruthy();
    await press('رفض');
    await waitFor(async () => expect(await statusOf(id)).toBe('rejected'));
  });

  it('the details show what the store collects from the delivery man, and تم التجهيز', async () => {
    const id = await insertOrder('preparing');
    await renderApp(ROUTES, { initialUrl: '/partner/orders' });
    await press('قيد التجهيز');
    const card = await screen.findByLabelText(`طلب رقم #${100000 + id}`);
    await fireEvent.press(within(card).getByRole('button', { name: 'التفاصيل' }));

    expect(await screen.findByText(`الطلب # ${100000 + id}`)).toBeTruthy();
    expect(screen.getByText('منى علي')).toBeTruthy();
    expect(screen.getByText('01554459196')).toBeTruthy();
    expect(screen.getByText('شارع 2، مبنى 2')).toBeTruthy();
    expect(screen.getByText('الآن')).toBeTruthy();
    expect(screen.getByText('2 × شاورما فراخ')).toBeTruthy();
    expect(screen.getByText('30.00 ج.م')).toBeTruthy();
    expect(screen.getByText('استلم من المندوب')).toBeTruthy();
    expect(screen.getByText('153.00 ج.م')).toBeTruthy();
    expect(screen.getByText(/يرجى إرسال تجهيز الطلب قبل ٥ دقائق/)).toBeTruthy();
    await press('تم التجهيز');
    await waitFor(async () => expect(await statusOf(id)).toBe('ready'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'تم التجهيز' })).toBeNull());
  });

  it('a ready pickup is handed over with تم الاستلام', async () => {
    const id = await insertOrder('ready', 'pickup');
    await renderApp(ROUTES, { initialUrl: `/partner-order/${id}` });
    expect(await screen.findByText('استلام من المحل')).toBeTruthy();
    expect(screen.queryByText('استلم من المندوب')).toBeNull();
    await press('تم الاستلام');
    await waitFor(async () => expect(await statusOf(id)).toBe('delivered'));
  });

  it('a store delivering itself sends a ready order out and closes it (Phase 13)', async () => {
    await sql("UPDATE stores SET delivered_by = 'store' WHERE id = ?", [store]);
    const id = await insertOrder('ready');
    await renderApp(ROUTES, { initialUrl: `/partner-order/${id}` });
    expect(await screen.findByRole('button', { name: 'خارج للتوصيل' })).toBeTruthy();
    expect(screen.queryByText('استلم من المندوب')).toBeNull();
    await press('خارج للتوصيل');
    await fireEvent.press(await screen.findByRole('button', { name: 'تم التوصيل' }));
    await waitFor(async () => expect(await statusOf(id)).toBe('delivered'));
  });

  it('منتجات: search, category tabs and the availability switch', async () => {
    await renderApp(ROUTES, { initialUrl: '/partner/products' });
    expect(await screen.findByText('شاورما فراخ')).toBeTruthy();
    expect(screen.getByText('كولا')).toBeTruthy();
    await press('مشروبات');
    await waitFor(() => expect(screen.queryByText('شاورما فراخ')).toBeNull());
    await press('الكل');
    await fireEvent.changeText(screen.getByPlaceholderText('ابحث عن منتج'), 'شاورما');
    await waitFor(() => expect(screen.queryByText('كولا')).toBeNull());
    await fireEvent(screen.getByRole('switch', { name: 'شاورما فراخ متاح' }), 'valueChange', false);
    await waitFor(async () => expect((await sql<{ active: number }[]>('SELECT active FROM products WHERE id = ?', [shawarma]))[0]!.active).toBe(0));
  });

  it('حسابي shows how many orders the store has made', async () => {
    await insertOrder('delivered');
    await insertOrder('delivered', 'pickup');
    await insertOrder('rejected');
    await renderApp(ROUTES, { initialUrl: '/partner/account' });
    expect(await screen.findByLabelText('الطلبات اللي اتعملت: 2')).toBeTruthy();
  });
});

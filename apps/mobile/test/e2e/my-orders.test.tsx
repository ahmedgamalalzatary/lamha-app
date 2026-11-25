import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import type { ResultSetHeader } from 'mysql2/promise';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { cartApi } from '@/features/cart/api/cart';
import { CartScreen } from '@/features/cart/screens/CartScreen';
import { OrdersScreen } from '@/features/checkout/OrdersScreen';
import { CustomerLive } from '@/features/orders/CustomerLive';
import { CustomerOrderScreen } from '@/features/orders/CustomerOrderScreen';
import { insertProduct, insertStore, linkPartner } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <CustomerLive />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'customer/orders': OrdersScreen,
  'customer/cart': CartScreen,
  'order/[id]': CustomerOrderScreen,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let customer: number;
let store: number;
let shawarma: number;
let fries: number;

/** An order straight in the table, at the status the test needs: 2 × شاورما فراخ and 1 × بطاطس. */
async function insertOrder(status: string, driverId: number | null = null): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, address_text, phone, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver, driver_id)
     VALUES (?, ?, UUID(), ?, 'delivery', 'شارع 2، مبنى 2، قهوه الشيماء', '01554459196', '', 195, 30, 225, 'app_share', 10, 19.5, 175.5, 175.5, ?)`,
    [customer, store, status, driverId],
  );
  for (const [product, name, price, quantity] of [
    [shawarma, 'شاورما فراخ', 85, 2],
    [fries, 'بطاطس', 25, 1],
  ] as const) {
    await sql(
      `INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, option_ids, removed_ingredient_ids, unit_price, quantity)
       VALUES (?, ?, ?, '[]', '[]', '[]', '[]', ?, ?)`,
      [res.insertId, product, name, price, quantity],
    );
  }
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
  shawarma = await insertProduct(store, 'شاورما فراخ', 85);
  fries = await insertProduct(store, 'بطاطس', 25);
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('طلباتي: an order\'s details (contract §8.8; real API)', () => {
  it('a delivered order opens the plain details view: store, address, captain, lines and totals', async () => {
    const driver = await insertUser('driver', '01011111111', { firstName: 'محمود', lastName: 'صبري احمد محمد' });
    const id = await insertOrder('delivered', driver);
    await renderApp(ROUTES, { initialUrl: '/customer/orders' });
    fireEvent.press(await screen.findByRole('button', { name: `طلب رقم #${100000 + id}` }));

    expect(await screen.findByText('محمود صبري احمد محمد')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'تفاصيل الطلب' })).toBeTruthy();
    expect(screen.getByText('تم التوصيل')).toBeTruthy();
    expect(screen.getByText('بطاطس & دوريتوس')).toBeTruthy();
    expect(screen.getByText(`رقم الطلب ${100000 + id}`)).toBeTruthy();
    expect(screen.getByText('عنوان التوصيل')).toBeTruthy();
    expect(screen.getByText('شارع 2، مبنى 2، قهوه الشيماء')).toBeTruthy();
    expect(screen.getByText('معلومات المندوب')).toBeTruthy();
    expect(screen.getByText('2 × شاورما فراخ')).toBeTruthy();
    expect(screen.getByText('170.00 ج.م')).toBeTruthy();
    expect(screen.getByText('1 × بطاطس')).toBeTruthy();
    expect(screen.getByText('195.00 ج.م')).toBeTruthy();
    expect(screen.getByText('30.00 ج.م')).toBeTruthy();
    expect(screen.getByText('قيمة الطلب')).toBeTruthy();
    expect(screen.getByText('225.00 ج.م')).toBeTruthy();
    expect(screen.getByText('الدفع عند الاستلام')).toBeTruthy();
    expect(screen.getByText('الآن')).toBeTruthy();
    // No service fee (owner, 2026-11-25), and no steps once it is delivered.
    expect(screen.queryByText('رسوم الخدمة')).toBeNull();
    expect(screen.queryByText('حالة الطلب')).toBeNull();
    expect(screen.getByRole('button', { name: 'اطلب تاني' })).toBeTruthy();
  });

  it('an active order shows where it is, moves on live when the store accepts, and has no "اطلب تاني"', async () => {
    const partner = await insertUser('partner', '01000000002');
    await linkPartner(partner, store);
    const id = await insertOrder('pending_review');
    await renderApp(ROUTES, { initialUrl: `/order/${id}` });

    expect(await screen.findByText('حالة الطلب')).toBeTruthy();
    expect(screen.getByLabelText('قيد المراجعة').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('قيد التجهيز').props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.queryByText('معلومات المندوب')).toBeNull();
    expect(screen.queryByRole('button', { name: 'اطلب تاني' })).toBeNull();

    const { accessToken } = await signInAs('01000000002');
    const res = await fetch(`${API_URL}/partner/orders/${id}/accept`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.status).toBe(200);
    await waitFor(() => expect(screen.getByLabelText('قيد التجهيز').props.accessibilityState).toMatchObject({ selected: true }));
  });

  it('"اطلب تاني" puts the order back in the cart and opens it, saying what was left out', async () => {
    const id = await insertOrder('delivered');
    await sql('UPDATE products SET active = 0 WHERE id = ?', [fries]);
    await renderApp(ROUTES, { initialUrl: `/order/${id}` });
    await screen.findByText('قيمة الطلب');
    press('اطلب تاني');

    expect(await screen.findByText('سلة المشتريات')).toBeTruthy();
    expect(await screen.findByText('لم نضف 1 منتج لم يعد متاحاً')).toBeTruthy();
    const { cart } = await cartApi.get();
    expect(cart?.lines.map((l) => [l.product.id, l.quantity])).toEqual([[shawarma, 2]]);
  });

  it('asks before replacing a cart from another store', async () => {
    const other = await insertStore('كشري الحادقة');
    await cartApi.add({ productId: await insertProduct(other, 'كشري', 40), quantity: 2, optionIds: [], removedIngredientIds: [] });
    const id = await insertOrder('delivered');
    await renderApp(ROUTES, { initialUrl: `/order/${id}` });
    await screen.findByText('قيمة الطلب');
    press('اطلب تاني');

    expect(await screen.findByText('تحتوي سلتك على منتجات من كشري الحادقة. هل تريد استبدالها؟')).toBeTruthy();
    press('استبدال السلة');
    expect(await screen.findByText('سلة المشتريات')).toBeTruthy();
    const { cart } = await cartApi.get();
    expect(cart?.store.id).toBe(store);
    expect(cart?.count).toBe(3);
  });
});

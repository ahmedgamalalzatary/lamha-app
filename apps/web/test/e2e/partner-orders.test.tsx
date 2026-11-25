import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { PartnerAccountPage } from '@/features/account/PartnerAccountPage';
import { PartnerOrdersPage } from '@/features/partner/PartnerOrdersPage';
import { PartnerProductsPage } from '@/features/partner/PartnerProductsPage';
import { PartnerStorePage } from '@/features/partner/PartnerStorePage';
import { insertCategory, insertProduct, insertStore, linkPartner } from '../utils/catalog';
import { insertUser, PASSWORD, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/partner/orders' }));

let client: QueryClient;
function renderWith(page: ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

let store: number;
let shawarma: number;
let customer: number;

/** The customer orders 2 × شاورما فراخ (85) for pickup through the real API, as the phone app does. */
async function placePickup(note = '01021327197 ده رقم الاستلام'): Promise<number> {
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
  await call('/me/cart', 'PATCH', accessToken, { cartId: cart.id, mode: 'pickup', note });
  const bill = await call('/me/checkout/quote', 'POST', accessToken, {});
  const requestId = crypto.randomUUID();
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
  forgetSession();
  await resetDb();
  store = await insertStore({ name: 'شاورما الساقية' });
  await sql('UPDATE stores SET pickup_allowed = true WHERE id = ?', [store]);
  shawarma = await insertProduct(store, await insertCategory(store, 'سندوتشات'), 'شاورما فراخ', 85);
  customer = await insertUser('customer', '01554459196', 'منى', 'علي');
  const partner = await insertUser('partner', '01000000002', 'مطعم', 'الفيومي');
  await linkPartner(partner, store);
  await signInAs('01000000002');
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('/partner/orders (contract §9, §11.1; real API and live socket)', () => {
  it('a new order pops up as it arrives; قبول starts preparing it', async () => {
    renderWith(<PartnerOrdersPage />);
    expect(await screen.findByText('لا توجد طلبات')).toBeInTheDocument();
    await screen.findByText('متصل');

    const id = await placePickup();
    const popup = await screen.findByRole('dialog', { name: `طلب رقم # ${100000 + id}` }, { timeout: 5000 });
    expect(within(popup).getByText('هل تريد قبول أو رفض الطلب ?')).toBeInTheDocument();
    expect(within(popup).getByText('01021327197 ده رقم الاستلام')).toBeInTheDocument();
    expect(within(popup).getByText('المنتجات 1')).toBeInTheDocument();
    expect(within(popup).getByText('شاورما فراخ')).toBeInTheDocument();
    expect(within(popup).getByText('2 عناصر')).toBeInTheDocument();
    expect(within(popup).getByText('الدفع عند الاستلام')).toBeInTheDocument();
    expect(within(popup).getByText('170.00 ج.م')).toBeInTheDocument();

    await userEvent.click(within(popup).getByRole('button', { name: 'قبول' }));
    await waitFor(async () => expect(await statusOf(id)).toBe('preparing'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('لا توجد طلبات')).toBeInTheDocument();
  });

  it('رفض refuses the order', async () => {
    const id = await placePickup();
    renderWith(<PartnerOrdersPage />);
    const popup = await screen.findByRole('dialog', { name: `طلب رقم # ${100000 + id}` });
    await userEvent.click(within(popup).getByRole('button', { name: 'رفض' }));
    await waitFor(async () => expect(await statusOf(id)).toBe('rejected'));
  });

  it('the details show what the store collects; تم التجهيز, then a pickup is handed over; print opens the browser\'s print', async () => {
    const delivery = await insertOrder('preparing');
    const pickup = await insertOrder('ready', 'pickup');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderWith(<PartnerOrdersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: 'قيد التجهيز' }));
    const row = (await screen.findByText(`#${100000 + delivery}`)).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'التفاصيل' }));

    const details = await screen.findByRole('dialog', { name: `الطلب # ${100000 + delivery}` });
    expect(within(details).getByText('منى علي')).toBeInTheDocument();
    expect(within(details).getByText('01554459196')).toBeInTheDocument();
    expect(within(details).getByText('شارع 2، مبنى 2')).toBeInTheDocument();
    expect(within(details).getByText('الآن')).toBeInTheDocument();
    expect(within(details).getByText('2 × شاورما فراخ')).toBeInTheDocument();
    expect(within(details).getByText('30.00 ج.م')).toBeInTheDocument();
    expect(within(details).getByText('استلم من المندوب')).toBeInTheDocument();
    expect(within(details).getByText('153.00 ج.م')).toBeInTheDocument();
    await user.click(within(details).getByRole('button', { name: 'طباعة' }));
    expect(print).toHaveBeenCalled();
    await user.click(within(details).getByRole('button', { name: 'تم التجهيز' }));
    await waitFor(async () => expect(await statusOf(delivery)).toBe('ready'));
    // A delivery leaves with the delivery man; the store has nothing more to do.
    expect(within(details).queryByRole('button', { name: 'تم الاستلام' })).toBeNull();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('tab', { name: 'تم التجهيز' }));
    const pickupRow = (await screen.findByText(`#${100000 + pickup}`)).closest('tr')!;
    await user.click(within(pickupRow).getByRole('button', { name: 'التفاصيل' }));
    const pickupDetails = await screen.findByRole('dialog', { name: `الطلب # ${100000 + pickup}` });
    expect(within(pickupDetails).queryByText('استلم من المندوب')).toBeNull();
    await user.click(within(pickupDetails).getByRole('button', { name: 'تم الاستلام' }));
    await waitFor(async () => expect(await statusOf(pickup)).toBe('delivered'));
  });
});

describe('/partner/products and /partner/store (contract §11.1; real API)', () => {
  it('lists only the partner\'s own menu and switches a product off', async () => {
    const other = await insertStore({ name: 'كشري الحادقة' });
    await insertProduct(other, await insertCategory(other, 'كشري'), 'كشري وسط', 30);
    renderWith(<PartnerProductsPage />);
    expect(await screen.findByText('شاورما فراخ')).toBeInTheDocument();
    expect(screen.queryByText('كشري وسط')).toBeNull();
    expect(screen.queryByLabelText('المتجر')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'متاح' }));
    await waitFor(async () => expect((await sql<{ active: number }[]>('SELECT active FROM products WHERE id = ?', [shawarma]))[0]!.active).toBe(0));
  });

  it('sets the hours and closes the store now, and offers nothing the admin sets', async () => {
    renderWith(<PartnerStorePage />);
    const user = userEvent.setup();
    const opens = await screen.findByLabelText('يفتح الساعة');
    expect(screen.queryByLabelText(/الحد الأدنى/)).toBeNull();
    // A time field takes its value whole, as the browser's time picker sets it.
    fireEvent.change(opens, { target: { value: '10:00' } });
    await user.click(screen.getByRole('switch', { name: 'مغلق الآن' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<{ opens_at: string; closed_now: number }[]>('SELECT opens_at, closed_now FROM stores WHERE id = ?', [store]);
    expect(row).toEqual({ opens_at: '10:00:00', closed_now: 1 });
  });

  it('the account shows how many orders the store has made', async () => {
    await insertOrder('delivered');
    await insertOrder('delivered', 'pickup');
    await insertOrder('rejected');
    renderWith(<PartnerAccountPage />);
    const row = (await screen.findByText('الطلبات اللي اتعملت')).parentElement!;
    expect(await within(row).findByText('2')).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { DriverRulesPage } from '@/features/drivers/screens/DriverRulesPage';
import { DriversPage } from '@/features/drivers/screens/DriversPage';
import { ComplaintsPage } from '@/features/support/screens/ComplaintsPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/drivers' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

let driver: number;
let customer: number;
let store: number;

/** One of his delivered orders: he earned 25 and `points` speed points. */
async function insertOrder(points = 0): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver, driver_id, driver_fee, driver_points)
     VALUES (?, ?, UUID(), 'delivered', 'delivery', '', 170, 30, 200, 'app_share', 10, 17, 153, 153, ?, 25, ?)`,
    [customer, store, driver, points],
  );
  return res.insertId;
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  driver = await insertUser('driver', '01011111111', 'كريم', 'سعيد');
  customer = await insertUser('customer', '01554459196');
  store = await insertStore({ name: 'شاورما الساقية' });
  await sql("INSERT INTO driver_settings (id, schedule, point_value) VALUES (1, '[null,null,null,null,null,null,null]', 2.5) ON DUPLICATE KEY UPDATE point_value = 2.5");
  await signInAs('01000000001');
});

describe('المندوبين › الحساب and الرسوم (contract §10, §8.7; real API)', () => {
  it('gives him his own fee rule, then back to the customer\'s fee', async () => {
    renderWith(<DriversPage />);
    const user = userEvent.setup();
    const row = (await screen.findByText('كريم سعيد')).closest('tr')!;
    expect(within(row).getByText('رسوم العميل')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'رسوم كريم سعيد' }));
    const dialog = screen.getByRole('dialog', { name: 'رسوم كريم سعيد' });
    await user.click(within(dialog).getByRole('switch', { name: 'رسوم خاصة به' }));
    await user.type(within(dialog).getByLabelText('الرسوم الأساسية (ج.م)'), '15');
    await user.type(within(dialog).getByLabelText('تشمل أول (كم)'), '2');
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('لكل كيلو زيادة (ج.م)'), '4.5');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(row).findByText('رسوم خاصة')).toBeInTheDocument();
    expect(await sql('SELECT base_fee, base_km, per_km FROM drivers WHERE user_id = ?', [driver])).toEqual([{ base_fee: '15.00', base_km: '2.00', per_km: '4.50' }]);

    await user.click(within(row).getByRole('button', { name: 'رسوم كريم سعيد' }));
    await user.click(within(screen.getByRole('dialog', { name: 'رسوم كريم سعيد' })).getByRole('switch', { name: 'رسوم خاصة به' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await within(row).findByText('رسوم العميل')).toBeInTheDocument();
  });

  it('shows his net, fines him with a reason and an order, deletes a fine, and pays out his speed points', async () => {
    const order = await insertOrder(4);
    renderWith(<DriversPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'حساب كريم سعيد' }));
    const dialog = screen.getByRole('dialog', { name: 'حساب كريم سعيد' });

    // 25 earned + 4 points × 2.5.
    expect(await within(dialog).findByText('35.00 ج.م')).toBeInTheDocument();
    expect(within(dialog).getByText('لا توجد خصومات')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('المبلغ (ج.م)'), '5');
    await user.type(within(dialog).getByLabelText('رقم الطلب (اختياري)'), 'abc');
    await user.type(within(dialog).getByLabelText('السبب'), 'تأخير في التوصيل');
    expect(within(dialog).getByRole('button', { name: 'إضافة الخصم' })).toBeDisabled();
    await user.clear(within(dialog).getByLabelText('رقم الطلب (اختياري)'));
    await user.type(within(dialog).getByLabelText('رقم الطلب (اختياري)'), `#${100000 + order}`);
    await user.click(within(dialog).getByRole('button', { name: 'إضافة الخصم' }));

    const fine = (await within(dialog).findByText('تأخير في التوصيل')).closest('tr')!;
    expect(within(fine).getByText(`#${100000 + order}`)).toBeInTheDocument();
    expect(await within(dialog).findByText('30.00 ج.م')).toBeInTheDocument();
    expect(await sql('SELECT amount, reason, order_id FROM driver_fines')).toEqual([{ amount: '5.00', reason: 'تأخير في التوصيل', order_id: order }]);

    await user.click(within(fine).getByRole('button', { name: 'حذف خصم تأخير في التوصيل' }));
    await user.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(await within(dialog).findByText('لا توجد خصومات')).toBeInTheDocument();

    expect(within(dialog).getByText(/نقاط لم تُصرف/)).toHaveTextContent('نقاط لم تُصرف: 4 نقطة (10.00 ج.م)');
    await user.click(within(dialog).getByRole('button', { name: 'تم الصرف' }));
    // He earns 2 more while the admin reads the question: only the 4 he confirmed are paid.
    await insertOrder(2);
    await user.click(screen.getByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(within(dialog).getByText(/نقاط لم تُصرف/)).toHaveTextContent('نقاط لم تُصرف: 2 نقطة (5.00 ج.م)'));
    expect(await sql('SELECT points, value FROM driver_payouts')).toEqual([{ points: 4, value: '10.00' }]);
  });
});

describe('نوبات العمل والقواعد › نقاط السرعة (contract §10; real API)', () => {
  it('sets the speed levels and what a point is worth', async () => {
    renderWith(<DriverRulesPage />);
    const user = userEvent.setup();
    expect(await screen.findByLabelText('قيمة النقطة (ج.م)')).toHaveValue(2.5);
    await user.click(screen.getByRole('button', { name: 'إضافة مستوى' }));
    await user.type(screen.getByLabelText('حتى (دقيقة لكل كم)'), '10');
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(screen.getByLabelText('النقاط'), '5');
    await user.clear(screen.getByLabelText('قيمة النقطة (ج.م)'));
    await user.type(screen.getByLabelText('قيمة النقطة (ج.م)'), '3');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    expect(await sql('SELECT speed_levels, point_value FROM driver_settings')).toEqual([{ speed_levels: [{ maxMinutesPerKm: 10, points: 5 }], point_value: '3.00' }]);
  });
});

describe('الشكاوى والاقتراحات (contract §10; real API)', () => {
  it("marks a delivery man's complaint", async () => {
    const order = await insertOrder();
    await sql("INSERT INTO tickets (customer_id, type, order_id, text) VALUES (?, 'complaint', ?, 'المحل اتأخر ساعة')", [driver, order]);
    renderWith(<ComplaintsPage />);
    const row = (await screen.findByText('المحل اتأخر ساعة')).closest('tr')!;
    expect(within(row).getByText('مندوب')).toBeInTheDocument();
    expect(within(row).getByText('كريم سعيد')).toBeInTheDocument();
  });
});

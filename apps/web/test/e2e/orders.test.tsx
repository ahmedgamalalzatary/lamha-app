import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { OrdersPage } from '@/features/orders/screens/OrdersPage';
import { DeliverySettingsPage } from '@/features/settings/screens/DeliverySettingsPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/orders' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  await signInAs('01000000001');
});

describe('الإعدادات › رسوم التوصيل والدفع (contract §8.7; real API)', () => {
  it('shows the fee rule with an example, and saves it with the global payment option', async () => {
    renderWith(<DeliverySettingsPage />);
    const user = userEvent.setup();
    const base = await screen.findByLabelText('الرسوم الأساسية (ج.م)');
    expect(base).toHaveValue(20);
    expect(screen.getByLabelText('تشمل أول (كم)')).toHaveValue(2);
    expect(screen.getByLabelText('لكل كيلو زيادة (ج.م)')).toHaveValue(10);
    // 3.3 km: 20 for the first 2 km, then 2 started km at 10.
    expect(screen.getByText('مثال: 3.3 كم = 40.00 ج.م')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'));
    await user.type(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'), '120');
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.clear(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'));
    await user.type(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'), '7.5');
    await user.clear(base);
    await user.type(base, '15');
    await user.selectOptions(screen.getByLabelText('ما يدفعه المندوب للمتجر'), 'fee_only');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<Record<string, string>[]>('SELECT base_fee, base_km, per_km, payout_option, app_percent FROM delivery_settings');
    expect(row).toEqual({ base_fee: '15.00', base_km: '2.00', per_km: '10.00', payout_option: 'fee_only', app_percent: '7.50' });
  });
});

describe('الطلبات: the orders table (contract §11; real API)', () => {
  async function insertOrder(values: { storeId: number; customerId: number; status?: string; note?: string; mode?: string; total?: number }) {
    const res = await sql<ResultSetHeader>(
      `INSERT INTO orders (customer_id, store_id, request_id, status, mode, phone, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
       VALUES (?, ?, UUID(), ?, ?, '01554459196', ?, 170, 30, ?, 'app_share', 10, 17, 153, 153)`,
      [values.customerId, values.storeId, values.status ?? 'pending_review', values.mode ?? 'delivery', values.note ?? '', values.total ?? 200],
    );
    return res.insertId;
  }

  it('lists the new orders with their code, flags, store, customer and total, by status tab', async () => {
    const store = await insertStore({ name: 'شاورما الساقية' });
    const customer = await insertUser('customer', '01554459196', 'منى', 'علي');
    const flagged = await insertOrder({ storeId: store, customerId: customer, note: 'بدون بصل' });
    await insertOrder({ storeId: store, customerId: customer, mode: 'pickup', total: 85 });
    await insertOrder({ storeId: store, customerId: customer, status: 'delivered', total: 300 });
    renderWith(<OrdersPage />);

    const row = (await screen.findByText(`#${100000 + flagged}`)).closest('tr')!;
    expect(within(row).getByText('بدون كابتن')).toBeInTheDocument();
    expect(within(row).getByText('ملاحظات')).toBeInTheDocument();
    expect(within(row).getByText('بدون بصل')).toBeInTheDocument();
    expect(within(row).getByText('شاورما الساقية')).toBeInTheDocument();
    expect(within(row).getByText('منى علي')).toBeInTheDocument();
    expect(within(row).getByText('200.00 ج.م')).toBeInTheDocument();
    expect(within(row).getByText('الدفع عند الاستلام')).toBeInTheDocument();
    // A pickup needs no captain.
    const pickup = screen.getByText('85.00 ج.م').closest('tr')!;
    expect(within(pickup).queryByText('بدون كابتن')).toBeNull();
    expect(within(pickup).getByText('استلام من المحل')).toBeInTheDocument();
    expect(screen.queryByText('300.00 ج.م')).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'تم التوصيل' }));
    expect(await screen.findByText('300.00 ج.م')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'ملغي' }));
    expect(await screen.findByText('لا توجد طلبات')).toBeInTheDocument();
  });
});

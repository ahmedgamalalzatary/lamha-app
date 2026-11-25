import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WEEK_DAY_NAMES } from '@tawsela/shared';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { DriverRulesPage } from '@/features/drivers/DriverRulesPage';
import { DriversPage } from '@/features/drivers/DriversPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/drivers' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const clock = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));

/** The global week: every day a shift that started `from` minutes ago (negative) or starts later. */
async function everyDay(from: number) {
  const week = JSON.stringify(Array.from({ length: 7 }, () => ({ start: clock(from), end: clock(from + 240) })));
  await sql('INSERT INTO driver_settings (id, schedule) VALUES (1, ?) ON DUPLICATE KEY UPDATE schedule = VALUES(schedule)', [week]);
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  await signInAs('01000000001');
});

describe('المندوبين (contract §10, §11; real API)', () => {
  it('adds a delivery man and shows the password once; he is off shift and follows the global week', async () => {
    renderWith(<DriversPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('لا يوجد مندوبين')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    const dialog = screen.getByRole('dialog', { name: 'إضافة مندوب' });
    await user.type(within(dialog).getByLabelText('الاسم الأول'), 'كريم');
    await user.type(within(dialog).getByLabelText('اسم العائلة'), 'سعيد');
    await user.type(within(dialog).getByLabelText('رقم الهاتف'), '01011111111');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    expect((await screen.findByTestId('generated-password')).textContent).toMatch(/\S{8,}/);
    await user.click(screen.getByRole('button', { name: 'تم' }));
    const row = (await screen.findByText('كريم سعيد')).closest('tr')!;
    expect(within(row).getByText('نشط')).toBeInTheDocument();
    expect(within(row).getByText('خارج الشفت')).toBeInTheDocument();
    expect(within(row).getByText('الجدول العام')).toBeInTheDocument();
    const [driver] = await sql<{ role: string }[]>("SELECT role FROM users WHERE phone = '01011111111'");
    expect(driver!.role).toBe('driver');
  });

  it('gives one delivery man his own week, and starts his shift after his window closed', async () => {
    await everyDay(-60);
    const id = await insertUser('driver', '01011111111', 'كريم', 'سعيد');
    renderWith(<DriversPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'نوبات كريم سعيد' }));
    const dialog = screen.getByRole('dialog', { name: 'نوبات كريم سعيد' });
    expect(within(dialog).getByText('يتبع الجدول العام في نوبات العمل والقواعد.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'جدول خاص به' }));
    // It starts from the global week; a day off three days from today, so today's shift stays.
    const off = (WEEKDAYS.indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(new Date())) + 3) % 7;
    await user.click(within(dialog).getByRole('checkbox', { name: WEEK_DAY_NAMES[off] }));
    expect(within(dialog).queryByLabelText(`${WEEK_DAY_NAMES[off]} من`)).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    const row = (await screen.findByText('جدول خاص')).closest('tr')!;
    const [{ schedule }] = (await sql<{ schedule: (unknown | null)[] }[]>('SELECT schedule FROM drivers WHERE user_id = ?', [id])) as [{ schedule: (unknown | null)[] }];
    expect(schedule[off]).toBeNull();
    expect(schedule[(off + 1) % 7]).toEqual({ start: clock(-60), end: clock(180) });

    await user.click(within(row).getByRole('button', { name: 'بدء الشفت لـ كريم سعيد' }));
    await user.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(await within(row).findByText('في الشفت')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'بدء الشفت لـ كريم سعيد' })).toBeNull();
  });
});

describe('نوبات العمل والقواعد (contract §15.1 #5; real API)', () => {
  it('sets the global week and the numbers', async () => {
    renderWith(<DriverRulesPage />);
    const user = userEvent.setup();
    const sunday = await screen.findByRole('checkbox', { name: 'الأحد' });
    expect(sunday).not.toBeChecked();
    expect(screen.getByLabelText('يبدأ قبل النوبة بـ (دقيقة)')).toHaveValue(30);
    expect(screen.getByLabelText('مدة عرض الطلب (ثانية)')).toHaveValue(60);

    await user.click(sunday);
    fireEvent.change(screen.getByLabelText('الأحد من'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('الأحد إلى'), { target: { value: '01:00' } });
    expect(screen.getByText('ينتهي في اليوم التالي')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('إيقاف بعد تخطي (طلب متتالي)'));
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(screen.getByLabelText('إيقاف بعد تخطي (طلب متتالي)'), '4');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<{ schedule: unknown[]; skip_block: number }[]>('SELECT schedule, skip_block FROM driver_settings');
    expect(row!.skip_block).toBe(4);
    expect(row!.schedule).toEqual([{ start: '10:00', end: '01:00' }, null, null, null, null, null, null]);
  });
});

describe('الطلبات: 🛵 gives an order to a delivery man (contract §11; real API)', () => {
  it('lists the delivery men, working ones first, and assigns one; "بدون كابتن" goes', async () => {
    const store = await insertStore({ name: 'شاورما الساقية' });
    const customer = await insertUser('customer', '01554459196', 'منى', 'علي');
    await insertUser('driver', '01011111111', 'كريم', 'سعيد');
    const res = await sql<ResultSetHeader>(
      `INSERT INTO orders (customer_id, store_id, request_id, status, mode, phone, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
       VALUES (?, ?, UUID(), 'preparing', 'delivery', '01554459196', '', 170, 30, 200, 'app_share', 10, 17, 153, 153)`,
      [customer, store],
    );
    const code = String(100000 + res.insertId);
    renderWith(<OrdersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: 'قيد التجهيز' }));
    const row = (await screen.findByText(`#${code}`)).closest('tr')!;
    expect(within(row).getByText('بدون كابتن')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: `تعيين كابتن للطلب #${code}` }));
    const dialog = screen.getByRole('dialog', { name: `تعيين كابتن للطلب #${code}` });
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.click(await within(dialog).findByRole('radio', { name: /كريم سعيد/ }));
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const after = (await screen.findByText('كريم سعيد')).closest('tr')!;
    expect(within(after).queryByText('بدون كابتن')).toBeNull();
    const [order] = await sql<{ driver_id: number | null }[]>('SELECT driver_id FROM orders WHERE id = ?', [res.insertId]);
    expect(order!.driver_id).not.toBeNull();
  });
});

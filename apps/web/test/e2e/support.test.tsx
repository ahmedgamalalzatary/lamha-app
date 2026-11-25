import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { ComplaintsPage } from '@/features/support/ComplaintsPage';
import { SupportPhonesPage } from '@/features/support/SupportPhonesPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/customers/complaints' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

let customer: number;
let store: number;

async function insertOrder(): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO orders (customer_id, store_id, request_id, status, mode, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver)
     VALUES (?, ?, UUID(), 'delivered', 'delivery', '', 170, 30, 200, 'app_share', 10, 17, 153, 153)`,
    [customer, store],
  );
  return res.insertId;
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  customer = await insertUser('customer', '01554459196');
  store = await insertStore({ name: 'بطاطس & دوريتوس' });
  await signInAs('01000000001');
});

describe('الشكاوى والاقتراحات (contract §11; real API)', () => {
  it('lists complaints with the customer and the order; the admin marks one done', async () => {
    const order = await insertOrder();
    await sql("INSERT INTO tickets (customer_id, type, order_id, text) VALUES (?, 'complaint', ?, 'الأكل وصل بارد')", [customer, order]);
    await sql("INSERT INTO tickets (customer_id, type, text) VALUES (?, 'suggestion', 'ضيفوا الدفع بالفيزا')", [customer]);
    renderWith(<ComplaintsPage />);
    const user = userEvent.setup();

    const row = (await screen.findByText('الأكل وصل بارد')).closest('tr')!;
    expect(within(row).getByText('01554459196')).toBeInTheDocument();
    expect(within(row).getByText(`#${100000 + order}`)).toBeInTheDocument();
    expect(within(row).getByText('بطاطس & دوريتوس')).toBeInTheDocument();
    expect(within(row).getByText('مفتوحة')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'واتساب 01554459196' })).toHaveAttribute('href', 'https://wa.me/201554459196');
    expect(screen.queryByText('ضيفوا الدفع بالفيزا')).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'تم الحل' }));
    expect(await within(row).findByText('تم الحل', { selector: 'span' })).toBeInTheDocument();
    const [saved] = await sql<{ status: string }[]>('SELECT status FROM tickets WHERE order_id = ?', [order]);
    expect(saved!.status).toBe('done');

    await user.click(screen.getByRole('tab', { name: 'الاقتراحات' }));
    expect(await screen.findByText('ضيفوا الدفع بالفيزا')).toBeInTheDocument();
    expect(screen.queryByText('الأكل وصل بارد')).not.toBeInTheDocument();
  });

  it('shows the ratings with their stars and reasons', async () => {
    const order = await insertOrder();
    await sql('INSERT INTO ratings (order_id, customer_id, store_id, stars, tags, text) VALUES (?, ?, ?, 1, ?, ?)', [
      order,
      customer,
      store,
      JSON.stringify(['missing_item', 'not_hot']),
      'ناقص البطاطس',
    ]);
    renderWith(<ComplaintsPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: 'التقييمات' }));
    const row = (await screen.findByText('ناقص البطاطس')).closest('tr')!;
    expect(within(row).getByLabelText('1 من 5 نجوم')).toBeInTheDocument();
    expect(within(row).getByText('عنصر مفقود')).toBeInTheDocument();
    expect(within(row).getByText('الطعام غير ساخن')).toBeInTheDocument();
    expect(within(row).getByText('بطاطس & دوريتوس')).toBeInTheDocument();
  });

  it('says when there is nothing yet', async () => {
    renderWith(<ComplaintsPage />);
    expect(await screen.findByText('لا توجد شكاوى')).toBeInTheDocument();
  });
});

describe('أرقام التواصل (contract §8.14; real API)', () => {
  it('adds, edits and removes the numbers "تواصل معنا" shows', async () => {
    renderWith(<SupportPhonesPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة رقم' }));
    await user.type(screen.getByLabelText('الاسم 1'), 'هاتف 1');
    await user.type(screen.getByLabelText('الرقم 1'), '01021846434');
    await user.click(screen.getByRole('button', { name: 'إضافة رقم' }));
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(screen.getByLabelText('الاسم 2'), 'واتساب');
    await user.type(screen.getByLabelText('الرقم 2'), '01100000009');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    expect(await sql('SELECT label, phone FROM support_phones ORDER BY sort_order')).toEqual([
      { label: 'هاتف 1', phone: '01021846434' },
      { label: 'واتساب', phone: '01100000009' },
    ]);

    await user.click(screen.getByRole('button', { name: 'حذف الرقم 1' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(async () => expect(await sql('SELECT label FROM support_phones')).toEqual([{ label: 'واتساب' }]));
  });
});

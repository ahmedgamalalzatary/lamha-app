import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/customers' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

let mona: number;

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  mona = await insertUser('customer', '01554459196', 'منى', 'علي');
  await insertUser('customer', '01100000002', 'كريم', 'سعيد');
  await signInAs('01000000001');
});

describe('العملاء and their wallets (contract §11 A3, A5; real API)', () => {
  it('lists the customers with their balance and finds one by name or phone', async () => {
    await sql('UPDATE users SET wallet_balance = 75.5 WHERE id = ?', [mona]);
    renderWith(<CustomersPage />);
    const row = (await screen.findByText('منى علي')).closest('tr')!;
    expect(within(row).getByText('01554459196')).toBeInTheDocument();
    expect(within(row).getByText('75.50 ج.م')).toBeInTheDocument();
    expect(screen.getByText('كريم سعيد')).toBeInTheDocument();

    await userEvent.setup().type(screen.getByLabelText('ابحث بالاسم أو رقم الهاتف أو البريد'), '01100');
    // The list reloads for the search: wait for its answer, then only the match is left.
    await waitFor(() => {
      expect(screen.getByText('كريم سعيد')).toBeInTheDocument();
      expect(screen.queryByText('منى علي')).toBeNull();
    });
  });

  it('adds to a wallet and deducts from it with a reason; never below 0 [Owner, 2026-11-26]', async () => {
    renderWith(<CustomersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'تعديل رصيد منى علي' }));
    let dialog = screen.getByRole('dialog', { name: 'رصيد منى علي' });
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('المبلغ'), '100');
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('السبب'), 'تعويض عن تأخير');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const row = screen.getByText('منى علي').closest('tr')!;
    expect(await within(row).findByText('100.00 ج.م')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'تعديل رصيد منى علي' }));
    dialog = screen.getByRole('dialog', { name: 'رصيد منى علي' });
    await user.click(within(dialog).getByRole('radio', { name: 'خصم' }));
    await user.type(within(dialog).getByLabelText('المبلغ'), '150');
    await user.type(within(dialog).getByLabelText('السبب'), 'خصم بالخطأ');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText('الرصيد أقل من مبلغ الخصم')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('المبلغ'));
    await user.type(within(dialog).getByLabelText('المبلغ'), '40');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await within(row).findByText('60.00 ج.م')).toBeInTheDocument();
    expect(await sql('SELECT kind, amount, note FROM wallet_transactions ORDER BY id')).toEqual([
      { kind: 'add', amount: '100.00', note: 'تعويض عن تأخير' },
      { kind: 'deduct', amount: '40.00', note: 'خصم بالخطأ' },
    ]);
  });
});

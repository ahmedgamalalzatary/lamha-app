import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { AdminsPage } from '@/features/admins/screens/AdminsPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/settings/admins' }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminsPage />
    </QueryClientProvider>,
  );
}

const rowOf = async (name: string) => (await screen.findByRole('cell', { name })).closest('tr')!;

/** Whether this phone signs in with this password on the real API. */
const signsIn = async (phone: string, password: string) =>
  (await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, password }) })).ok;

let saraId: number;

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001', 'أحمد');
  saraId = await insertUser('admin', '01000000009', 'سارة');
  await insertUser('partner', '01000000002', 'مطعم');
  await signInAs('01000000001');
});

describe('حسابات الإدارة (contract §1.1 A23; real API)', () => {
  it('lists the admins only; the signed-in one is marked and has no actions', async () => {
    renderPage();
    const me = await rowOf('أحمد (أنت)');
    expect(within(me).queryByRole('button')).toBeNull();
    const other = await rowOf('سارة');
    expect(within(other).getByText('01000000009')).toBeInTheDocument();
    expect(within(other).getByText('نشط')).toBeInTheDocument();
    expect(within(other).getByRole('button', { name: 'إعادة تعيين كلمة المرور' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'مطعم' })).toBeNull();
  });

  it('adds an admin and shows the generated password once; it signs in', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة مسؤول' });
    const save = within(dialog).getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByLabelText('الاسم الأول'), 'منى');
    await user.type(within(dialog).getByLabelText('رقم الهاتف'), '01554459196');
    await user.click(save);

    const shown = await screen.findByRole('dialog', { name: 'كلمة المرور الجديدة' });
    const password = within(shown).getByTestId('generated-password').textContent!;
    expect(within(shown).getByText(/لن تظهر مرة أخرى/)).toBeInTheDocument();
    await user.click(within(shown).getByRole('button', { name: 'نسخ' }));
    // user-event gives the page a clipboard; read back what was copied.
    expect(await navigator.clipboard.readText()).toBe(password);
    expect(within(shown).getByRole('button', { name: 'تم النسخ' })).toBeInTheDocument();
    expect(await signsIn('01554459196', password)).toBe(true);

    await user.click(within(shown).getByRole('button', { name: 'تم' }));
    expect(screen.queryByText(password)).toBeNull();
    expect(await rowOf('منى')).toBeInTheDocument();
  });

  it('shows the error when the phone already has an account', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة مسؤول' });
    await user.type(within(dialog).getByLabelText('الاسم الأول'), 'منى');
    await user.type(within(dialog).getByLabelText('رقم الهاتف'), '01000000002');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('رقم الهاتف مسجل بالفعل');
  });

  it('resets a password after a confirmation and shows the new one', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(within(await rowOf('سارة')).getByRole('button', { name: 'إعادة تعيين كلمة المرور' }));
    const confirm = await screen.findByRole('dialog', { name: 'إعادة تعيين كلمة المرور' });
    await user.click(within(confirm).getByRole('button', { name: 'تأكيد' }));
    const password = (await screen.findByTestId('generated-password')).textContent!;
    expect(await signsIn('01000000009', password)).toBe(true);
  });

  it('disables an admin after a confirmation; cancel does nothing', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(within(await rowOf('سارة')).getByRole('button', { name: 'إيقاف الحساب' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'إيقاف الحساب' })).getByRole('button', { name: 'إلغاء' }));
    const [still] = await sql<{ disabled_at: Date | null }[]>('SELECT disabled_at FROM users WHERE id = ?', [saraId]);
    expect(still?.disabled_at).toBeNull();

    await user.click(within(await rowOf('سارة')).getByRole('button', { name: 'إيقاف الحساب' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'إيقاف الحساب' })).getByRole('button', { name: 'تأكيد' }));
    await vi.waitFor(async () => expect(within(await rowOf('سارة')).getByText('موقوف')).toBeInTheDocument());
    expect(within(await rowOf('سارة')).getByRole('button', { name: 'تفعيل الحساب' })).toBeInTheDocument();
    const [row] = await sql<{ disabled_at: Date | null }[]>('SELECT disabled_at FROM users WHERE id = ?', [saraId]);
    expect(row?.disabled_at).not.toBeNull();
  });
});

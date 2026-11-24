import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { StoreFormPage } from '@/features/stores/StoreFormPage';
import { StoresPage } from '@/features/stores/StoresPage';
import { insertStore, linkPartner } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { API_URL } from '../utils/env';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/stores' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const rowOf = async (name: string) => (await screen.findByRole('cell', { name: new RegExp(name) })).closest('tr')!;
const signsIn = async (phone: string, password: string) =>
  (await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, password }) })).ok;

beforeEach(async () => {
  forgetSession();
  router.push.mockReset();
  await resetDb();
  await insertUser('admin', '01000000001', 'أحمد');
  await signInAs('01000000001');
});

describe('الموردين: the stores table (contract §11; real API)', () => {
  it('lists the stores with type, partner phone, fee and open or closed, and filters by type', async () => {
    const sakia = await insertStore({ name: 'شاورما الساقية', deliveryFee: 15 });
    await insertStore({ name: 'جرين بول', closedNow: true });
    await insertStore({ name: 'صيدلية الشفاء', vertical: 'pharmacy', active: false });
    await linkPartner(await insertUser('partner', '01000000002'), sakia);
    renderWith(<StoresPage />);

    const row = await rowOf('شاورما الساقية');
    expect(within(row).getByText('المطاعم')).toBeInTheDocument();
    expect(within(row).getByText('01000000002')).toBeInTheDocument();
    expect(within(row).getByText('15.00 ج.م')).toBeInTheDocument();
    expect(within(row).getByText('مفتوح')).toBeInTheDocument();
    expect(within(await rowOf('جرين بول')).getByText('مغلق')).toBeInTheDocument();
    expect(within(await rowOf('صيدلية الشفاء')).getByText('مخفي')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'صيدليات' }));
    expect(await rowOf('صيدلية الشفاء')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /شاورما الساقية/ })).toBeNull();
  });

  it('shows the empty state when there are no stores', async () => {
    renderWith(<StoresPage />);
    expect(await screen.findByText('لا توجد متاجر')).toBeInTheDocument();
  });
});

describe('إضافة متجر: a store and its partner account (contract §2, §11; real API)', () => {
  it('creates the store, shows the partner password once (it signs in) and opens the store', async () => {
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    const save = await screen.findByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('اسم المتجر'), 'كشري الحادقة');
    await user.selectOptions(screen.getByLabelText('النوع'), 'restaurant');
    await user.clear(screen.getByLabelText('مدة التوصيل (دقيقة)'));
    await user.type(screen.getByLabelText('مدة التوصيل (دقيقة)'), '20');
    await user.clear(screen.getByLabelText('رسوم التوصيل (ج.م)'));
    await user.type(screen.getByLabelText('رسوم التوصيل (ج.م)'), '10');
    await user.clear(screen.getByLabelText('الحد الأدنى للطلب (ج.م)'));
    await user.type(screen.getByLabelText('الحد الأدنى للطلب (ج.م)'), '35');
    await user.click(screen.getByRole('switch', { name: 'الاستلام من المحل' }));
    await user.type(screen.getByLabelText('الاسم الأول'), 'صابر');
    await user.type(screen.getByLabelText('رقم الهاتف'), '01554459196');
    expect(save).toBeEnabled();
    await user.click(save);

    const shown = await screen.findByRole('dialog', { name: 'كلمة المرور الجديدة' });
    const password = within(shown).getByTestId('generated-password').textContent!;
    expect(await signsIn('01554459196', password)).toBe(true);
    const [store] = await sql<{ id: number; name: string; delivery_fee: string; pickup_allowed: number; layout: string }[]>(
      'SELECT id, name, delivery_fee, pickup_allowed, layout FROM stores',
    );
    expect(store).toMatchObject({ name: 'كشري الحادقة', delivery_fee: '10.00', pickup_allowed: 1, layout: 'list' });

    await user.click(within(shown).getByRole('button', { name: 'تم' }));
    expect(router.push).toHaveBeenCalledWith(`/stores/${store!.id}`);
  });

  it('suggests the grid layout for a market', async () => {
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('النوع'), 'market');
    expect(screen.getByLabelText('طريقة عرض المنتجات')).toHaveValue('grid');
  });

  it('shows the error when the partner phone already has an account', async () => {
    await insertUser('customer', '01554459196');
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('اسم المتجر'), 'كشري');
    await user.type(screen.getByLabelText('الاسم الأول'), 'صابر');
    await user.type(screen.getByLabelText('رقم الهاتف'), '01554459196');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('رقم الهاتف مسجل بالفعل');
    expect(await sql<unknown[]>('SELECT id FROM stores')).toHaveLength(0);
  });
});

describe('تعديل متجر (real API)', () => {
  it('edits the store settings', async () => {
    const id = await insertStore({ name: 'شاورما الساقية' });
    renderWith(<StoreFormPage storeId={id} />);
    const user = userEvent.setup();
    const fee = await screen.findByLabelText('رسوم التوصيل (ج.م)');
    expect(fee).toHaveValue(15);
    await user.clear(fee);
    await user.type(fee, '22.5');
    await user.click(screen.getByRole('switch', { name: 'مغلق الآن' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<{ delivery_fee: string; closed_now: number }[]>('SELECT delivery_fee, closed_now FROM stores WHERE id = ?', [id]);
    expect(row).toEqual({ delivery_fee: '22.50', closed_now: 1 });
  });

  it("lists the store's partner accounts and resets one's password", async () => {
    const id = await insertStore();
    await linkPartner(await insertUser('partner', '01000000002', 'حسن'), id);
    renderWith(<StoreFormPage storeId={id} />);
    const user = userEvent.setup();
    const row = await rowOf('حسن');
    await user.click(within(row).getByRole('button', { name: 'إعادة تعيين كلمة المرور' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'إعادة تعيين كلمة المرور' })).getByRole('button', { name: 'تأكيد' }));
    const password = (await screen.findByTestId('generated-password')).textContent!;
    expect(await signsIn('01000000002', password)).toBe(true);
  });

  it('adds another partner account to the store', async () => {
    const id = await insertStore();
    renderWith(<StoreFormPage storeId={id} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة حساب' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة حساب مورد' });
    await user.type(within(dialog).getByLabelText('الاسم الأول'), 'منى');
    await user.type(within(dialog).getByLabelText('رقم الهاتف'), '01554459197');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    const password = (await screen.findByTestId('generated-password')).textContent!;
    expect(await signsIn('01554459197', password)).toBe(true);
    expect(await rowOf('منى')).toBeInTheDocument();
  });
});

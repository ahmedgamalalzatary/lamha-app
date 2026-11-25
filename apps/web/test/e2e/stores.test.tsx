import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { StoreFormPage } from '@/features/stores/StoreFormPage';
import { StoresPage } from '@/features/stores/StoresPage';
import { anyZone, insertStore, linkPartner } from '../utils/catalog';
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
  it('lists the stores with type, partner phone, who pays the store and open or closed, and filters by type', async () => {
    const sakia = await insertStore({ name: 'شاورما الساقية', payoutOption: 'app_share' });
    await insertStore({ name: 'جرين بول', closedNow: true });
    await insertStore({ name: 'صيدلية الشفاء', vertical: 'pharmacy', active: false });
    await linkPartner(await insertUser('partner', '01000000002'), sakia);
    renderWith(<StoresPage />);

    const row = await rowOf('شاورما الساقية');
    expect(within(row).getByText('المطاعم')).toBeInTheDocument();
    expect(within(row).getByText('01000000002')).toBeInTheDocument();
    expect(within(row).getByText('بعد نسبة التطبيق')).toBeInTheDocument();
    expect(within(await rowOf('جرين بول')).getByText('حسب الإعدادات')).toBeInTheDocument();
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
    const zone = await anyZone();
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    const save = await screen.findByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('اسم المتجر'), 'كشري الحادقة');
    await user.selectOptions(screen.getByLabelText('النوع'), 'restaurant');
    await user.clear(screen.getByLabelText('مدة التوصيل (دقيقة)'));
    await user.type(screen.getByLabelText('مدة التوصيل (دقيقة)'), '20');
    // The fee is the global distance rule (§8.7); the store only chooses who pays whom.
    expect(screen.queryByLabelText('رسوم التوصيل (ج.م)')).toBeNull();
    await user.selectOptions(screen.getByLabelText('ما يدفعه المندوب للمتجر'), 'nothing');
    await user.type(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'), '101');
    await user.clear(screen.getByLabelText('الحد الأدنى للطلب (ج.م)'));
    await user.type(screen.getByLabelText('الحد الأدنى للطلب (ج.م)'), '35');
    await user.click(screen.getByRole('switch', { name: 'الاستلام من المحل' }));
    await user.type(screen.getByLabelText('الاسم الأول'), 'صابر');
    await user.type(screen.getByLabelText('رقم الهاتف'), '01554459196');
    // Every store delivers in a zone (review F21): no zone, no save.
    expect(save).toBeDisabled();
    expect(screen.queryByRole('option', { name: 'بدون منطقة' })).toBeNull();
    await screen.findByRole('option', { name: 'الفيوم' });
    await user.selectOptions(screen.getByLabelText('منطقة التوصيل'), String(zone));
    // A percentage over 100 cannot be saved.
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'));
    await user.type(screen.getByLabelText('نسبة التطبيق من المنتجات (%)'), '12.5');
    expect(save).toBeEnabled();
    await user.click(save);

    const shown = await screen.findByRole('dialog', { name: 'كلمة المرور الجديدة' });
    const password = within(shown).getByTestId('generated-password').textContent!;
    expect(await signsIn('01554459196', password)).toBe(true);
    const [store] = await sql<{ id: number; name: string; payout_option: string; app_percent: string; pickup_allowed: number; layout: string; zone_id: number }[]>(
      'SELECT id, name, payout_option, app_percent, pickup_allowed, layout, zone_id FROM stores',
    );
    expect(store).toMatchObject({ name: 'كشري الحادقة', payout_option: 'nothing', app_percent: '12.50', pickup_allowed: 1, layout: 'list', zone_id: zone });

    await user.click(within(shown).getByRole('button', { name: 'تم' }));
    expect(router.push).toHaveBeenCalledWith(`/stores/${store!.id}`);
  });

  it('says so when the cuisines cannot load, and retries', async () => {
    await sql("INSERT INTO cuisines (name, sort_order) VALUES ('بروست', 0)");
    // The API answers 500 while the table is away.
    await sql('RENAME TABLE cuisines TO cuisines_away');
    try {
      renderWith(<StoreFormPage />);
      expect(await screen.findByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
    } finally {
      await sql('RENAME TABLE cuisines_away TO cuisines');
    }
    await userEvent.setup().click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByRole('button', { name: 'بروست' })).toBeInTheDocument();
  });

  it('suggests the grid layout for a market', async () => {
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('النوع'), 'market');
    expect(screen.getByLabelText('طريقة عرض المنتجات')).toHaveValue('grid');
  });

  it('shows the error when the partner phone already has an account', async () => {
    await insertUser('customer', '01554459196');
    const zone = await anyZone();
    renderWith(<StoreFormPage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('اسم المتجر'), 'كشري');
    await user.type(screen.getByLabelText('الاسم الأول'), 'صابر');
    await user.type(screen.getByLabelText('رقم الهاتف'), '01554459196');
    await screen.findByRole('option', { name: 'الفيوم' });
    await user.selectOptions(screen.getByLabelText('منطقة التوصيل'), String(zone));
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
    const payout = await screen.findByLabelText('ما يدفعه المندوب للمتجر');
    expect(payout).toHaveValue('');
    expect(screen.getByText('بدون موقع لا يستطيع العملاء طلب التوصيل من هذا المتجر.')).toBeInTheDocument();
    await user.selectOptions(payout, 'fee_only');
    await user.click(screen.getByRole('switch', { name: 'مغلق الآن' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<{ payout_option: string; app_percent: string | null; closed_now: number }[]>(
      'SELECT payout_option, app_percent, closed_now FROM stores WHERE id = ?',
      [id],
    );
    expect(row).toEqual({ payout_option: 'fee_only', app_percent: null, closed_now: 1 });
  });

  it('does not say "saved" for an edit typed while the save was on its way', async () => {
    const id = await insertStore({ name: 'شاورما الساقية' });
    renderWith(<StoreFormPage storeId={id} />);
    const user = userEvent.setup();
    const name = await screen.findByLabelText('اسم المتجر');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await user.type(name, ' 2');
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'حفظ' })).toBeEnabled());
    expect(screen.queryByText('تم حفظ التغييرات')).not.toBeInTheDocument();
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

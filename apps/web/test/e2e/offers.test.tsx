import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { BannersPage } from '@/features/offers/BannersPage';
import { CouponsPage } from '@/features/offers/CouponsPage';
import { DiscountsPage } from '@/features/offers/DiscountsPage';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { pngFile, removeUpload } from '../utils/image';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/marketing/coupons' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

let store: number;
let shawarma: number;
const uploads: string[] = [];

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  store = await insertStore({ name: 'سارة سوشي' });
  shawarma = await insertProduct(store, await insertCategory(store, 'السوشي'), 'كومبو الفرايد', 350);
  await signInAs('01000000001');
});

afterEach(async () => {
  for (const path of uploads.splice(0)) await removeUpload(path);
});

describe('الكوبونات والقسائم (contract §11 A15; real API)', () => {
  it('makes a code for one store, who pays it and its limits; the table lists it', async () => {
    renderWith(<CouponsPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('لا توجد كوبونات بعد')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إضافة كوبون' }));
    const dialog = screen.getByRole('dialog', { name: 'إضافة كوبون' });
    await user.type(within(dialog).getByLabelText('الكود'), 'Black Friday');
    await user.type(within(dialog).getByLabelText('الاسم'), 'بلاك فرايداي');
    await within(dialog).findByRole('option', { name: 'سارة سوشي' });
    await user.selectOptions(within(dialog).getByLabelText('المتجر'), 'سارة سوشي');
    await user.type(within(dialog).getByLabelText('قيمة الخصم (ج.م)'), '6');
    await user.type(within(dialog).getByLabelText('الحد الأدنى للطلب (ج.م)'), '150');
    await user.type(within(dialog).getByLabelText('صالح حتى'), '2030-11-30');
    await user.selectOptions(within(dialog).getByLabelText('يتحمل الخصم'), 'المتجر');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    const row = (await screen.findByText('Black Friday', { selector: 'td' })).closest('tr')!;
    expect(within(row).getByText('سارة سوشي')).toBeInTheDocument();
    expect(within(row).getByText('خصم 6 ج.م على 150 ج.م')).toBeInTheDocument();
    expect(within(row).getByText('المتجر')).toBeInTheDocument();
    const [saved] = await sql<{ store_id: number; value: string; min_order: string; paid_by: string; per_customer: number; ends_at: Date }[]>(
      'SELECT store_id, value, min_order, paid_by, per_customer, ends_at FROM coupons',
    );
    expect(saved).toMatchObject({ store_id: store, value: '6.00', min_order: '150.00', paid_by: 'store', per_customer: 1 });
    expect(saved!.ends_at).not.toBeNull();
  });

  it('a percentage with its cap; a code already in use says so', async () => {
    await sql("INSERT INTO coupons (code, code_key, title, kind, value, min_order, per_customer, paid_by) VALUES ('WELCOME', 'welcome', 'أهلاً', 'amount', 10, 0, 1, 'app')");
    renderWith(<CouponsPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة كوبون' }));
    const dialog = screen.getByRole('dialog', { name: 'إضافة كوبون' });
    await user.type(within(dialog).getByLabelText('الكود'), 'welcome');
    await user.type(within(dialog).getByLabelText('الاسم'), 'خصم 20%');
    await user.selectOptions(within(dialog).getByLabelText('نوع الخصم'), 'نسبة مئوية');
    await user.type(within(dialog).getByLabelText('قيمة الخصم (%)'), '20');
    await user.type(within(dialog).getByLabelText('أقصى خصم (ج.م)'), '50');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText('هذا الكود مستخدم في كوبون آخر')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('الكود'));
    await user.type(within(dialog).getByLabelText('الكود'), 'SAVE20');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    const row = (await screen.findByText('SAVE20', { selector: 'td' })).closest('tr')!;
    expect(within(row).getByText('خصم 20% (حتى 50 ج.م)')).toBeInTheDocument();
    expect(within(row).getByText('كل المتاجر')).toBeInTheDocument();
  });

  it('switches a code off', async () => {
    await sql("INSERT INTO coupons (code, code_key, title, kind, value, min_order, per_customer, paid_by) VALUES ('WELCOME', 'welcome', 'أهلاً', 'amount', 10, 0, 1, 'app')");
    renderWith(<CouponsPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: 'تفعيل WELCOME' }));
    await vi.waitFor(async () => expect(await sql('SELECT active FROM coupons')).toEqual([{ active: 0 }]));
  });
});

describe('البنرات (contract §11 A14; real API)', () => {
  it('adds a banner for a store, on the carousel or as a rail over its products', async () => {
    renderWith(<BannersPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('لا توجد بنرات بعد')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إضافة بنر' }));
    const dialog = screen.getByRole('dialog', { name: 'إضافة بنر' });
    await user.upload(within(dialog).getByLabelText('رفع صورة: صورة البنر'), pngFile());
    expect(await within(dialog).findByRole('img', { name: 'صورة البنر' })).toBeInTheDocument();
    await within(dialog).findByRole('option', { name: 'سارة سوشي' });
    await user.selectOptions(within(dialog).getByLabelText('المتجر'), 'سارة سوشي');
    await user.selectOptions(within(dialog).getByLabelText('المكان'), 'شريط منتجات المتجر');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    const row = (await screen.findByText('سارة سوشي', { selector: 'td' })).closest('tr')!;
    expect(within(row).getByText('شريط منتجات المتجر')).toBeInTheDocument();
    const [saved] = await sql<{ place: string; opens: string; image: string }[]>('SELECT place, opens, image FROM banners');
    expect(saved).toMatchObject({ place: 'rail', opens: 'products' });
    uploads.push(saved!.image);
  });
});

describe('خصومات المنتجات (contract §11 A15; real API)', () => {
  it('sets a product\'s old price and who pays; ending it clears the old price', async () => {
    renderWith(<DiscountsPage />);
    const user = userEvent.setup();
    await screen.findByRole('option', { name: 'سارة سوشي' });
    await user.selectOptions(screen.getByLabelText('المتجر'), 'سارة سوشي');
    const row = (await screen.findByText('كومبو الفرايد')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'خصم كومبو الفرايد' }));
    const dialog = screen.getByRole('dialog', { name: 'خصم كومبو الفرايد' });
    await user.type(within(dialog).getByLabelText('السعر قبل الخصم (ج.م)'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText('السعر قبل الخصم يجب أن يكون أعلى من السعر')).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('السعر قبل الخصم (ج.م)'));
    await user.type(within(dialog).getByLabelText('السعر قبل الخصم (ج.م)'), '400');
    await user.selectOptions(within(dialog).getByLabelText('يتحمل الخصم'), 'التطبيق');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(row).findByText('400.00 ج.م')).toBeInTheDocument();
    expect(await sql('SELECT old_price, discount_paid_by FROM products WHERE id = ?', [shawarma])).toEqual([{ old_price: '400.00', discount_paid_by: 'app' }]);

    await user.click(within(row).getByRole('button', { name: 'إنهاء خصم كومبو الفرايد' }));
    await vi.waitFor(async () => expect(await sql('SELECT old_price FROM products WHERE id = ?', [shawarma])).toEqual([{ old_price: null }]));
  });
});

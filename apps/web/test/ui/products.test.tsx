import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { InactiveProductsPage } from '@/features/products/InactiveProductsPage';
import { StoreProductsPage } from '@/features/products/StoreProductsPage';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { pngFile, removeUpload } from '../utils/image';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/products' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const rowOf = async (name: string) => (await screen.findByRole('cell', { name: new RegExp(name) })).closest('tr')!;

let store: number;

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001', 'أحمد');
  await signInAs('01000000001');
  store = await insertStore({ name: 'شاورما الساقية' });
});

describe('منتجات الموردين: categories (contract §11, §1.1 A10; real API)', () => {
  it("shows the chosen store's categories with their product counts, and switches store", async () => {
    const cat = await insertCategory(store, 'سندوتشات');
    await insertProduct(store, cat, 'شاورما فراخ', 85);
    const other = await insertStore({ name: 'كشري الحادقة' });
    await insertCategory(other, 'الكشري');
    renderWith(<StoreProductsPage initialStoreId={store} />);

    const categories = await screen.findByRole('list', { name: 'الأقسام' });
    expect(await within(categories).findByText('سندوتشات')).toBeInTheDocument();
    expect(within(categories).getByText('1 منتج')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('المتجر'), String(other));
    // Another store's lists are new lists: find them again.
    expect(await screen.findByText('الكشري')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'الأقسام' })).queryByText('سندوتشات')).toBeNull();
  });

  it('adds a category, moves it up and deletes an empty one', async () => {
    await insertCategory(store, 'سندوتشات', 0);
    renderWith(<StoreProductsPage initialStoreId={store} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة قسم' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة قسم' });
    await user.type(within(dialog).getByLabelText('اسم القسم'), 'وجبات');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    const categories = screen.getByRole('list', { name: 'الأقسام' });
    const meals = (await within(categories).findByText('وجبات')).closest('li')!;
    await user.click(within(meals).getByRole('button', { name: 'تحريك لأعلى' }));
    await vi.waitFor(async () => {
      const rows = await sql<{ name: string }[]>('SELECT name FROM store_categories ORDER BY sort_order');
      expect(rows.map((r) => r.name)).toEqual(['وجبات', 'سندوتشات']);
    });

    await user.click(within(meals).getByRole('button', { name: 'حذف القسم' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف القسم' })).getByRole('button', { name: 'تأكيد' }));
    await vi.waitFor(() => expect(within(categories).queryByText('وجبات')).toBeNull());
  });

  it('says why a category with products cannot be deleted', async () => {
    const cat = await insertCategory(store, 'سندوتشات');
    await insertProduct(store, cat, 'شاورما فراخ', 85);
    renderWith(<StoreProductsPage initialStoreId={store} />);
    const user = userEvent.setup();
    const item = (await within(await screen.findByRole('list', { name: 'الأقسام' })).findByText('سندوتشات')).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'حذف القسم' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف القسم' })).getByRole('button', { name: 'تأكيد' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('احذف منتجات القسم أو انقلها أولاً');
  });
});

describe('منتجات الموردين: products (real API)', () => {
  it('adds a product with a photo, then switches it off', async () => {
    await insertCategory(store, 'سندوتشات');
    renderWith(<StoreProductsPage initialStoreId={store} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'إضافة منتج' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة منتج' });
    const save = within(dialog).getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByLabelText('اسم المنتج'), 'شاورما فراخ');
    await user.type(within(dialog).getByLabelText('السعر (ج.م)'), '85.5');
    await user.type(within(dialog).getByLabelText('الوحدة (اختياري)'), 'سندوتش');
    await user.upload(within(dialog).getByLabelText('رفع صورة: صورة المنتج'), pngFile());
    expect(await within(dialog).findByRole('img', { name: 'صورة المنتج' })).toBeInTheDocument();
    await user.click(save);

    const row = await rowOf('شاورما فراخ');
    expect(within(row).getByText('85.50 ج.م')).toBeInTheDocument();
    expect(within(row).getByText('سندوتشات')).toBeInTheDocument();
    const [saved] = await sql<{ price: string; unit: string; image: string }[]>('SELECT price, unit, image FROM products');
    expect(saved).toMatchObject({ price: '85.50', unit: 'سندوتش' });
    expect(saved!.image).toMatch(/^\/uploads\/catalog\//);

    await user.click(within(row).getByRole('switch', { name: 'متاح' }));
    await vi.waitFor(async () => {
      const [off] = await sql<{ active: number }[]>('SELECT active FROM products');
      expect(off!.active).toBe(0);
    });
    await removeUpload(saved!.image);
  });

  it('edits and deletes a product', async () => {
    const cat = await insertCategory(store, 'سندوتشات');
    await insertProduct(store, cat, 'شاورما فراخ', 85);
    renderWith(<StoreProductsPage initialStoreId={store} />);
    const user = userEvent.setup();
    await user.click(within(await rowOf('شاورما فراخ')).getByRole('button', { name: 'تعديل' }));
    const dialog = await screen.findByRole('dialog', { name: 'تعديل منتج' });
    const price = within(dialog).getByLabelText('السعر (ج.م)');
    await user.clear(price);
    await user.type(price, '95');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(await rowOf('شاورما فراخ')).findByText('95.00 ج.م')).toBeInTheDocument();

    await user.click(within(await rowOf('شاورما فراخ')).getByRole('button', { name: 'حذف' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف المنتج' })).getByRole('button', { name: 'تأكيد' }));
    expect(await screen.findByText('لا توجد منتجات')).toBeInTheDocument();
  });

  it('asks for a category before the first product', async () => {
    renderWith(<StoreProductsPage initialStoreId={store} />);
    expect(await screen.findByText('أضف قسماً أولاً، ثم أضف منتجاته')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة منتج' })).toBeDisabled();
  });
});

describe('منتجات غير فعالة (contract §11, §1.1 A11; real API)', () => {
  it("lists every store's switched-off products and switches one back on", async () => {
    const cat = await insertCategory(store, 'سندوتشات');
    await insertProduct(store, cat, 'شاورما فراخ', 85, true);
    await insertProduct(store, cat, 'شاورما لحمة', 110, false);
    renderWith(<InactiveProductsPage />);

    const row = await rowOf('شاورما لحمة');
    expect(within(row).getByText('شاورما الساقية')).toBeInTheDocument();
    expect(within(row).getByText('سندوتشات')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /شاورما فراخ/ })).toBeNull();

    const user = userEvent.setup();
    await user.click(within(row).getByRole('button', { name: 'تفعيل' }));
    expect(await screen.findByText('لا توجد منتجات غير فعالة')).toBeInTheDocument();
  });
});

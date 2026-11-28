import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { CuisinesPage } from '@/features/catalog/screens/CuisinesPage';
import { HomeSectionsPage } from '@/features/catalog/screens/HomeSectionsPage';
import { HomeTilesPage } from '@/features/catalog/screens/HomeTilesPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { pngFile, removeUpload } from '../utils/image';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/catalog/cuisines' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const itemOf = async (list: string, text: string) => (await within(await screen.findByRole('list', { name: list })).findByText(text)).closest('li')!;

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001', 'أحمد');
  await signInAs('01000000001');
});

describe('أنواع الأكل: cuisine circles (contract §8.3, §1.1 A12; real API)', () => {
  it('adds, renames, reorders and deletes cuisines', async () => {
    await sql("INSERT INTO cuisines (name, sort_order) VALUES ('بروست', 0)");
    renderWith(<CuisinesPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'إضافة' }));
    let dialog = await screen.findByRole('dialog', { name: 'إضافة نوع' });
    await user.type(within(dialog).getByLabelText('الاسم'), 'باستا');
    // Save waits for the picture on its way, or the cuisine would be saved without it.
    // A plain change event: the check below runs before the upload can answer.
    fireEvent.change(within(dialog).getByLabelText('رفع صورة: الصورة'), { target: { files: [pngFile()] } });
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    expect(await within(dialog).findByRole('img', { name: 'الصورة' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    await user.click(within(await itemOf('أنواع الأكل', 'باستا')).getByRole('button', { name: 'تحريك لأعلى' }));
    await vi.waitFor(async () => {
      const rows = await sql<{ name: string }[]>('SELECT name FROM cuisines ORDER BY sort_order');
      expect(rows.map((r) => r.name)).toEqual(['باستا', 'بروست']);
    });

    await user.click(within(await itemOf('أنواع الأكل', 'بروست')).getByRole('button', { name: 'تعديل' }));
    dialog = await screen.findByRole('dialog', { name: 'تعديل نوع' });
    await user.clear(within(dialog).getByLabelText('الاسم'));
    await user.type(within(dialog).getByLabelText('الاسم'), 'اكل صحى');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await itemOf('أنواع الأكل', 'اكل صحى')).toBeInTheDocument();

    await user.click(within(await itemOf('أنواع الأكل', 'اكل صحى')).getByRole('button', { name: 'حذف' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف النوع' })).getByRole('button', { name: 'تأكيد' }));
    await vi.waitFor(async () => expect(await sql<unknown[]>('SELECT id FROM cuisines')).toHaveLength(1));
    const [pasta] = await sql<{ image: string | null }[]>("SELECT image FROM cuisines WHERE name = 'باستا'");
    expect(pasta?.image).toMatch(/^\/uploads\/catalog\//);
    await removeUpload(pasta!.image!);
  });
});

describe('مربعات الرئيسية: home tiles (contract §8.2, §1.1 A12; real API)', () => {
  it('shows each row with what its tiles open', async () => {
    const maky = await insertStore({ name: 'Maky' });
    await sql(
      "INSERT INTO home_tiles (label, tile_row, sort_order, target_vertical, target_store_id, badge) VALUES ('المطاعم', 'fixed', 0, 'restaurant', NULL, NULL), ('Maky', 'scroll', 0, NULL, ?, 'الماكيز')",
      [maky],
    );
    renderWith(<HomeTilesPage />);
    const fixed = await itemOf('الصف الأول (ثابت)', 'المطاعم');
    expect(within(fixed).getByText('يفتح: المطاعم')).toBeInTheDocument();
    const pinned = await itemOf('الصف الثاني (يتحرك أفقياً)', 'Maky');
    expect(within(pinned).getByText('يفتح متجر: Maky')).toBeInTheDocument();
    expect(within(pinned).getByText('الماكيز')).toBeInTheDocument();
  });

  it('adds a tile that opens a vertical and one pinned to a store, then deletes one', async () => {
    const maky = await insertStore({ name: 'Maky' });
    renderWith(<HomeTilesPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'إضافة مربع' }));
    let dialog = await screen.findByRole('dialog', { name: 'إضافة مربع' });
    await user.type(within(dialog).getByLabelText('الاسم'), 'صيدليات');
    await user.selectOptions(within(dialog).getByLabelText('يفتح'), 'pharmacy');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await itemOf('الصف الأول (ثابت)', 'صيدليات')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'إضافة مربع' }));
    dialog = await screen.findByRole('dialog', { name: 'إضافة مربع' });
    await user.type(within(dialog).getByLabelText('الاسم'), 'Maky');
    await user.type(within(dialog).getByLabelText('شارة (اختياري)'), 'سريع');
    await user.selectOptions(within(dialog).getByLabelText('الصف'), 'scroll');
    await user.selectOptions(within(dialog).getByLabelText('يفتح'), 'store');
    await user.selectOptions(within(dialog).getByLabelText('المتجر'), String(maky));
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await itemOf('الصف الثاني (يتحرك أفقياً)', 'Maky')).toBeInTheDocument();
    const [tile] = await sql<{ target_store_id: number; badge: string }[]>("SELECT target_store_id, badge FROM home_tiles WHERE label = 'Maky'");
    expect(tile).toEqual({ target_store_id: maky, badge: 'سريع' });

    await user.click(within(await itemOf('الصف الأول (ثابت)', 'صيدليات')).getByRole('button', { name: 'حذف' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف المربع' })).getByRole('button', { name: 'تأكيد' }));
    await vi.waitFor(async () => expect(await sql<unknown[]>('SELECT id FROM home_tiles')).toHaveLength(1));
  });
});

describe('أقسام الرئيسية الملونة: coloured home sections (L1 #2; real API)', () => {
  it('lists the sections in order with their stores', async () => {
    const [a, b] = [await insertStore({ name: 'شاورما الساقية' }), await insertStore({ name: 'كشري الحادقة' })];
    await sql("INSERT INTO home_sections (id, title, background, ink, sort_order) VALUES (1, 'الأكثر طلباً', '#E8A33D', '#3A1E00', 0)");
    await sql('INSERT INTO home_section_stores (section_id, store_id, sort_order) VALUES (1, ?, 0), (1, ?, 1)', [b, a]);
    renderWith(<HomeSectionsPage />);
    const item = await itemOf('أقسام الرئيسية', 'الأكثر طلباً');
    expect(within(item).getByText('كشري الحادقة، شاورما الساقية')).toBeInTheDocument();
  });

  it('adds a section with its colours and stores in order, then deletes it', async () => {
    const [a, b] = [await insertStore({ name: 'شاورما الساقية' }), await insertStore({ name: 'كشري الحادقة' })];
    renderWith(<HomeSectionsPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'إضافة قسم' }));
    const dialog = await screen.findByRole('dialog', { name: 'إضافة قسم' });
    await user.type(within(dialog).getByLabelText('العنوان'), 'الجديد');
    fireEvent.input(within(dialog).getByLabelText('لون القسم'), { target: { value: '#4e9a82' } });
    fireEvent.input(within(dialog).getByLabelText('لون العنوان'), { target: { value: '#ffffff' } });
    // Save waits for at least one store.
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.selectOptions(within(dialog).getByLabelText('إضافة متجر'), String(b));
    await user.selectOptions(within(dialog).getByLabelText('إضافة متجر'), String(a));
    expect(within(within(dialog).getByRole('list', { name: 'متاجر القسم' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('كشري الحادقة'),
      expect.stringContaining('شاورما الساقية'),
    ]);
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await itemOf('أقسام الرئيسية', 'الجديد')).toBeInTheDocument();
    const [row] = await sql<{ id: number; background: string; ink: string }[]>("SELECT id, background, ink FROM home_sections WHERE title = 'الجديد'");
    expect(row).toMatchObject({ background: '#4E9A82', ink: '#FFFFFF' });
    const stores = await sql<{ store_id: number }[]>('SELECT store_id FROM home_section_stores WHERE section_id = ? ORDER BY sort_order', [row!.id]);
    expect(stores.map((s) => s.store_id)).toEqual([b, a]);

    await user.click(within(await itemOf('أقسام الرئيسية', 'الجديد')).getByRole('button', { name: 'حذف' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'حذف القسم' })).getByRole('button', { name: 'تأكيد' }));
    await vi.waitFor(async () => expect(await sql<unknown[]>('SELECT id FROM home_sections')).toHaveLength(0));
  });
});

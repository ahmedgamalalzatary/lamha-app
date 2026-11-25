import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultSetHeader } from 'mysql2/promise';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { CampaignsPage } from '@/features/campaigns/CampaignsPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/marketing/notifications' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const FAYOUM = '[{"lat":29.25,"lng":30.78},{"lat":29.36,"lng":30.78},{"lat":29.36,"lng":30.9},{"lat":29.25,"lng":30.9}]';

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  const a = await insertUser('customer', '01554459196');
  await insertUser('customer', '01100000001');
  const zone = (await sql<ResultSetHeader>("INSERT INTO zones (name, polygon) VALUES ('الفيوم', ?)", [FAYOUM])).insertId;
  await sql(
    `INSERT INTO addresses (user_id, zone_id, type, building, apartment, street, landmark, phone, lat, lng, is_default)
     VALUES (?, ?, 'apartment', 'مبنى 2', 'شقه 2', 'شارع 2', 'temp', '01554459196', 29.3205, 30.8364, true)`,
    [a, zone],
  );
  await signInAs('01000000001');
});

describe('الإشعارات التفاعلية (contract §11; real API)', () => {
  it('sends a push to one zone\'s customers after a confirm, then lists it', async () => {
    renderWith(<CampaignsPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('لم يتم إرسال إشعارات بعد')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'إرسال' });
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText('العنوان'), 'خصم 20%');
    await user.type(screen.getByLabelText('الرسالة'), 'على كل المطاعم النهارده');
    await user.selectOptions(await screen.findByLabelText('إلى'), 'الفيوم');
    await user.click(send);
    const dialog = screen.getByRole('dialog', { name: 'إرسال الإشعار' });
    expect(within(dialog).getByText('سيصل الإشعار الآن إلى عملاء منطقة الفيوم.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد' }));

    expect(await screen.findByText('تم الإرسال إلى 1 عميل')).toBeInTheDocument();
    const row = (await screen.findByText('على كل المطاعم النهارده')).closest('tr')!;
    expect(within(row).getByText('خصم 20%')).toBeInTheDocument();
    expect(within(row).getByText('الفيوم')).toBeInTheDocument();
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(screen.getByLabelText('العنوان')).toHaveValue('');
    expect(await sql('SELECT COUNT(*) AS n FROM notifications')).toEqual([{ n: 1 }]);
  });

  it('sends to every customer by default', async () => {
    renderWith(<CampaignsPage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('العنوان'), 'أهلاً');
    await user.type(screen.getByLabelText('الرسالة'), 'جرب توصيلة');
    await user.click(screen.getByRole('button', { name: 'إرسال' }));
    expect(screen.getByText('سيصل الإشعار الآن إلى كل العملاء.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(await screen.findByText('تم الإرسال إلى 2 عميل')).toBeInTheDocument();
    expect(within((await screen.findByText('جرب توصيلة')).closest('tr')!).getByText('كل العملاء')).toBeInTheDocument();
  });
});

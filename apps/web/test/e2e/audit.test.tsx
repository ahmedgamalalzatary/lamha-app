import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { AuditPage } from '@/features/audit/AuditPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/settings/audit' }));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuditPage />
    </QueryClientProvider>,
  );

/** A logged change, as the API writes it (UTC). */
const logged = (action: string, type: string, name: string, details: object, at = '2026-11-24 10:05:00') =>
  sql('INSERT INTO audit_log (actor_id, actor_name, action, target_type, target_id, target_name, details, created_at) VALUES (1, ?, ?, ?, 7, ?, ?, ?)', [
    'أحمد علي',
    action,
    type,
    name,
    JSON.stringify(details),
    at,
  ]);

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001', 'أحمد');
  await signInAs('01000000001');
});

describe('سجل التغييرات (review F70; real API)', () => {
  it('lists who changed what and when, newest first, in Cairo time', async () => {
    await logged('zone.create', 'zone', 'الفيوم', { name: 'الفيوم', active: true, corners: 4 });
    await logged('store.update', 'store', 'كشري التحرير', { active: false, deliveryFee: 20 }, '2026-11-24 10:30:00');
    renderPage();

    const rows = (await screen.findAllByRole('row')).slice(1);
    expect(rows).toHaveLength(2);
    const [store, zone] = rows as [HTMLElement, HTMLElement];
    expect(within(store).getByText('2026/11/24 12:30')).toBeInTheDocument();
    expect(within(store).getByText('أحمد علي')).toBeInTheDocument();
    expect(within(store).getByText('تعديل متجر')).toBeInTheDocument();
    expect(within(store).getByText('كشري التحرير')).toBeInTheDocument();
    expect(within(store).getByText('مفعل: لا · رسوم التوصيل: 20')).toBeInTheDocument();
    expect(within(zone).getByText('إضافة منطقة')).toBeInTheDocument();
    expect(within(zone).getByText('الاسم: الفيوم · مفعل: نعم · نقاط الحدود: 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'عرض المزيد' })).toBeNull();
  });

  it('loads older changes on request', async () => {
    for (let i = 0; i < 52; i++) await logged('admin.password', 'account', `مسؤول ${i}`, {});
    renderPage();
    expect(await screen.findByText('مسؤول 51')).toBeInTheDocument();
    expect(screen.queryByText('مسؤول 1')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(await screen.findByText('مسؤول 1')).toBeInTheDocument();
    expect(screen.getAllByText('إعادة تعيين كلمة مرور مسؤول')).toHaveLength(52);
  });

  it('says so when nothing has changed yet', async () => {
    renderPage();
    expect(await screen.findByText('لا توجد تغييرات بعد')).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { PointsSettingsPage } from '@/features/settings/screens/PointsSettingsPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/settings/points' }));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  await signInAs('01000000001');
});

describe('الإعدادات › النقاط (contract §8.16, §11 A21; real API)', () => {
  it('shows the rules with an example and saves them [Owner: two settings]', async () => {
    renderWith(<PointsSettingsPage />);
    const user = userEvent.setup();
    const earn = await screen.findByLabelText('كل كم ج.م = نقطة واحدة');
    expect(earn).toHaveValue(10);
    expect(screen.getByLabelText('قيمة النقطة (ج.م)')).toHaveValue(0.1);
    expect(screen.getByLabelText('الحد الأدنى للاستبدال (نقطة)')).toHaveValue(100);
    expect(screen.getByText('مثال: طلب منتجاته 200.00 ج.م يكسب 20 نقطة، قيمتها 2.00 ج.م.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('الحد الأدنى للاستبدال (نقطة)'));
    await user.type(screen.getByLabelText('الحد الأدنى للاستبدال (نقطة)'), '2.5');
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.clear(screen.getByLabelText('الحد الأدنى للاستبدال (نقطة)'));
    await user.type(screen.getByLabelText('الحد الأدنى للاستبدال (نقطة)'), '240');
    await user.clear(screen.getByLabelText('قيمة النقطة (ج.م)'));
    await user.type(screen.getByLabelText('قيمة النقطة (ج.م)'), '0.25');
    expect(screen.getByText('مثال: طلب منتجاته 200.00 ج.م يكسب 20 نقطة، قيمتها 5.00 ج.م.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم حفظ التغييرات');
    expect(await sql('SELECT earn_every, point_value, minimum FROM points_settings')).toEqual([{ earn_every: '10.00', point_value: '0.2500', minimum: 240 }]);
  });
});

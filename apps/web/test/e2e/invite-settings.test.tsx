import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { InviteSettingsPage } from '@/features/campaigns/InviteSettingsPage';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/marketing/invites' }));

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

describe('التسويق والعروض › مكافآت الدعوة (contract §8.17, §11 A17; real API)', () => {
  it('shows Tawsilty\'s rules and saves changes; the expiry switch hides the days [Owner]', async () => {
    renderWith(<InviteSettingsPage />);
    const user = userEvent.setup();
    expect(await screen.findByLabelText('مكافأة صاحب الدعوة (ج.م)')).toHaveValue(300);
    expect(screen.getByLabelText('أقصى استخدام في الطلب الواحد (ج.م)')).toHaveValue(30);
    expect(screen.getByLabelText('رصيد الصديق عند التسجيل (ج.م)')).toHaveValue(25);
    expect(screen.getByLabelText('مدة أول طلب للصديق (يوم)')).toHaveValue(30);
    expect(screen.getByLabelText('الحد الشهري للمكافآت (ج.م)')).toHaveValue(1000);
    expect(screen.getByLabelText('صلاحية المكافأة (يوم)')).toHaveValue(30);
    expect(screen.getByLabelText('صلاحية رصيد الصديق (يوم)')).toHaveValue(30);

    await user.clear(screen.getByLabelText('أقصى استخدام في الطلب الواحد (ج.م)'));
    await user.type(screen.getByLabelText('أقصى استخدام في الطلب الواحد (ج.م)'), '400');
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.clear(screen.getByLabelText('أقصى استخدام في الطلب الواحد (ج.م)'));
    await user.type(screen.getByLabelText('أقصى استخدام في الطلب الواحد (ج.م)'), '50');

    await user.click(screen.getByRole('switch', { name: 'رصيد الدعوة ينتهي بعد مدة' }));
    expect(screen.queryByLabelText('صلاحية المكافأة (يوم)')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم حفظ التغييرات');
    expect(await sql('SELECT reward_per_order, expires FROM invite_settings')).toEqual([{ reward_per_order: '50.00', expires: 0 }]);
  });
});

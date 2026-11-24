import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { PartnerAccountPage } from '@/features/account/PartnerAccountPage';
import { insertUser, resetDb, signInAs } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => '/partner/account' }));

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('partner', '01000000002', 'مطعم', 'الفيومي');
  await signInAs('01000000002');
});

describe('الحساب in the partner area (contract §11.1; real API)', () => {
  it("shows the partner's name and phone from /me, and signs out", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PartnerAccountPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('مطعم الفيومي')).toBeInTheDocument();
    expect(screen.getByText('01000000002')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));
    await vi.waitFor(() => expect(window.localStorage.getItem('tawsela.dashboard.session')).toBeNull());
  });
});

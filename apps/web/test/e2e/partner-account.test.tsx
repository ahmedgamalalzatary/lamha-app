import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthResponse, Me } from '@tawsela/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import { api, forgetSession } from '@/core/api/client';
import { PartnerAccountPage } from '@/features/account/PartnerAccountPage';
import { insertUser, PASSWORD, resetDb, signInAs } from '../utils/db';
import { API_URL } from '../utils/env';

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

  it("never shows the next partner the previous one's cached account", async () => {
    await insertUser('partner', '01000000003', 'كافيه', 'النيل');
    render(
      <Providers>
        <PartnerAccountPage />
      </Providers>,
    );
    expect(await screen.findByText('مطعم الفيومي')).toBeInTheDocument();
    await api.signOut();
    await act(() => api.signIn('01000000003', PASSWORD));
    expect(await screen.findByText('كافيه النيل')).toBeInTheDocument();
    expect(screen.queryByText('مطعم الفيومي')).not.toBeInTheDocument();
  });

  it('uses the token another tab already renewed, instead of replaying the old one', async () => {
    // This tab still holds A (its access token expired); another tab renewed A into B meanwhile.
    const a = JSON.parse(window.localStorage.getItem('tawsela.dashboard.session')!) as AuthResponse;
    window.localStorage.setItem('tawsela.dashboard.session', JSON.stringify({ ...a, accessToken: `${a.accessToken}x` }));
    forgetSession();
    api.session();
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: a.refreshToken }),
    });
    window.localStorage.setItem('tawsela.dashboard.session', JSON.stringify(await res.json()));
    await expect(api.request<Me>('/me')).resolves.toMatchObject({ phone: '01000000002' });
  });
});

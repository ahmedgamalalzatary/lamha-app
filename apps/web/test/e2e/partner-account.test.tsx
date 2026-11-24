import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Me } from '@tawsela/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import { api, forgetSession, sessionStore } from '@/core/api/client';
import { PartnerAccountPage } from '@/features/account/PartnerAccountPage';
import { cookieJar } from '../utils/cookies';
import { cookieRenews, insertUser, PASSWORD, resetDb, signInAs } from '../utils/db';
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
    const cookie = cookieJar.get('tawsela_rt');
    await userEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));
    await vi.waitFor(() => expect(api.session()).toBeNull());
    await vi.waitFor(() => expect(cookieJar.get('tawsela_rt')).toBeUndefined());
    expect(await cookieRenews(cookie)).toBe(false);
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

  it('renews with the cookie another tab already rotated, keeping the session', async () => {
    // This tab's access token expired; another tab of the same browser renewed the cookie meanwhile.
    const a = api.session()!;
    sessionStore.save({ ...a, accessToken: `${a.accessToken}x` });
    const other = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session': 'cookie' },
      body: '{}',
      credentials: 'include',
    });
    expect(other.ok).toBe(true);
    await expect(api.request<Me>('/me')).resolves.toMatchObject({ phone: '01000000002' });
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { AreaShell } from '@/features/shell/AreaShell';
import { cookieJar } from '../utils/cookies';
import { cookieRenews, insertUser, resetDb, signInAs } from '../utils/db';

const replace = vi.fn();
let pathname = '/';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => pathname }));

beforeEach(async () => {
  replace.mockClear();
  forgetSession();
  await resetDb();
});

describe('the area shell (sidebar + role gate; real API)', () => {
  it('shows the admin sidebar and the page to an admin', async () => {
    await insertUser('admin', '01000000001', 'أحمد', 'محمود');
    await signInAs('01000000001');
    pathname = '/orders';
    render(<AreaShell area="admin">صفحة الطلبات</AreaShell>);
    expect(await screen.findByText('صفحة الطلبات')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toHaveTextContent('حسابات الإدارة');
    expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
  });

  it('shows a partner its own sidebar, without the admin pages', async () => {
    await insertUser('partner', '01000000002');
    await signInAs('01000000002');
    pathname = '/partner/orders';
    render(<AreaShell area="partner">طلبات المطعم</AreaShell>);
    expect(await screen.findByText('طلبات المطعم')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toHaveTextContent('المتجر');
    expect(screen.getByRole('navigation')).not.toHaveTextContent('حسابات الإدارة');
  });

  it('never shows an admin page to a partner: it is sent to its own area', async () => {
    await insertUser('partner', '01000000002');
    await signInAs('01000000002');
    render(<AreaShell area="admin">سري</AreaShell>);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/partner/orders'));
    expect(screen.queryByText('سري')).toBeNull();
  });

  it('sends a signed-out visitor to sign-in', async () => {
    render(<AreaShell area="admin">سري</AreaShell>);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('سري')).toBeNull();
  });

  it('signs out from the sidebar: the session ends on the server and the page goes', async () => {
    await insertUser('admin', '01000000001');
    await signInAs('01000000001');
    const cookie = cookieJar.get('tawsela_rt');
    pathname = '/';
    render(<AreaShell area="admin">الرئيسية هنا</AreaShell>);
    await userEvent.click(await screen.findByRole('button', { name: 'تسجيل الخروج' }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('الرئيسية هنا')).toBeNull();
    await vi.waitFor(() => expect(cookieJar.get('tawsela_rt')).toBeUndefined());
    expect(await cookieRenews(cookie)).toBe(false);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { SignInRoute } from '@/features/auth/screens/SignInRoute';
import { insertUser, PASSWORD, resetDb } from '../utils/db';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/sign-in' }));

beforeEach(async () => {
  replace.mockClear();
  forgetSession();
  await resetDb();
});

async function signIn(phone: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('رقم الهاتف'), phone);
  await user.type(screen.getByLabelText('كلمة المرور'), password);
  await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
}

describe('the dashboard sign-in (contract §2, W1; real API)', () => {
  it('keeps the button off until a valid phone and a password are typed', async () => {
    render(<SignInRoute />);
    const button = await screen.findByRole('button', { name: 'تسجيل الدخول' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('رقم الهاتف'), '0155');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'x');
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('رقم الهاتف'), '4459196');
    expect(button).toBeEnabled();
  });

  it('signs an admin in and opens the admin area', async () => {
    await insertUser('admin', '01000000001');
    render(<SignInRoute />);
    await signIn('01000000001', PASSWORD);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('opens the partner area for a partner', async () => {
    await insertUser('partner', '01000000002');
    render(<SignInRoute />);
    await signIn('01000000002', PASSWORD);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/partner/orders'));
  });

  it('shows why a sign-in failed', async () => {
    await insertUser('admin', '01000000001');
    render(<SignInRoute />);
    await signIn('01000000001', 'wrongpass');
    expect(await screen.findByRole('alert')).toHaveTextContent('رقم الهاتف أو كلمة المرور غير صحيحة');
    expect(replace).not.toHaveBeenCalled();
  });

  it('turns a customer away: the dashboard is for admins and stores', async () => {
    await insertUser('customer', '01554459196');
    render(<SignInRoute />);
    await signIn('01554459196', PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent('لوحة التحكم للإدارة والمطاعم فقط');
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows and hides the password', async () => {
    render(<SignInRoute />);
    const field = await screen.findByLabelText('كلمة المرور');
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'إظهار كلمة المرور' }));
    expect(field).toHaveAttribute('type', 'text');
  });
});

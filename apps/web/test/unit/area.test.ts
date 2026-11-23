import type { AuthResponse, Role } from '@tawsela/shared';
import { describe, expect, it } from 'vitest';
import { areaRedirect, homeOf } from '@/features/auth/area';

const as = (role: Role) => ({ user: { role } }) as AuthResponse;

describe('areaRedirect (one dashboard, two areas: contract §2, §11.1)', () => {
  it('waits while the stored session is read', () => {
    expect(areaRedirect(undefined, 'admin')).toBe('wait');
    expect(areaRedirect(undefined, 'sign-in')).toBe('wait');
  });

  it('sends a signed-out visitor to sign-in and lets them use it', () => {
    expect(areaRedirect(null, 'admin')).toBe('/sign-in');
    expect(areaRedirect(null, 'partner')).toBe('/sign-in');
    expect(areaRedirect(null, 'sign-in')).toBeNull();
  });

  it('lets each role into its own area only', () => {
    expect(areaRedirect(as('admin'), 'admin')).toBeNull();
    expect(areaRedirect(as('partner'), 'partner')).toBeNull();
    expect(areaRedirect(as('partner'), 'admin')).toBe('/partner/orders');
    expect(areaRedirect(as('admin'), 'partner')).toBe('/');
  });

  it('sends a signed-in account from sign-in to its area', () => {
    expect(areaRedirect(as('admin'), 'sign-in')).toBe('/');
    expect(areaRedirect(as('partner'), 'sign-in')).toBe('/partner/orders');
  });

  it('treats another role found in storage as signed out', () => {
    expect(areaRedirect(as('customer'), 'admin')).toBe('/sign-in');
    expect(areaRedirect(as('driver'), 'sign-in')).toBeNull();
  });
});

describe('homeOf', () => {
  it("is the admin's الرئيسية and the partner's الطلبات", () => {
    expect(homeOf('admin')).toBe('/');
    expect(homeOf('partner')).toBe('/partner/orders');
  });
});

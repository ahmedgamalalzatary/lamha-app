import { gate } from '@/core/navigation/gate-rules';
import { me } from '../utils/fixtures';

describe('gate (one app, the account picks the screens: contract §2)', () => {
  it('waits while the stored session is read', () => {
    expect(gate('loading', null, 'customer')).toBe('wait');
    expect(gate('loading', null, 'auth')).toBe('wait');
    // Offline at launch: the stored session is kept, so nobody is sent to sign-in yet.
    expect(gate('offline', null, 'customer')).toBe('wait');
  });

  it('sends a signed-out visitor to sign-in, and lets them use the sign-in screens', () => {
    expect(gate('signedOut', null, 'customer')).toBe('/sign-in');
    expect(gate('signedOut', null, 'account')).toBe('/sign-in');
    expect(gate('signedOut', null, 'auth')).toBeNull();
  });

  it('sends a signed-in account away from the sign-in screens to its own tabs', () => {
    expect(gate('signedIn', me({ role: 'driver' }), 'auth')).toBe('/driver');
  });

  it('keeps each role in its own tabs', () => {
    expect(gate('signedIn', me({ role: 'partner' }), 'partner')).toBeNull();
    expect(gate('signedIn', me({ role: 'partner' }), 'customer')).toBe('/partner');
    expect(gate('signedIn', me({ role: 'customer' }), 'admin')).toBe('/customer');
  });

  it('lets every signed-in role open its account screens', () => {
    expect(gate('signedIn', me({ role: 'admin' }), 'account')).toBeNull();
  });
});

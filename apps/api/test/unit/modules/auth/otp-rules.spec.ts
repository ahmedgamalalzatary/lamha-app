import { checkCode, newCode, resendWait } from '../../../../src/modules/auth/otp-rules.js';

const now = new Date('2026-11-23T12:00:00Z');
const later = (s: number) => new Date(now.getTime() + s * 1000);

const row = (over: Partial<Parameters<typeof checkCode>[0]> = {}) => ({
  codeHash: 'right',
  attempts: 0,
  expiresAt: later(300),
  consumedAt: null,
  ...over,
});

describe('checkCode (OTP expiry and attempts, contract §8.1)', () => {
  it('accepts the right code in time', () => {
    expect(checkCode(row(), 'right', now)).toBe('ok');
  });

  it('refuses a wrong code', () => {
    expect(checkCode(row(), 'nope', now)).toBe('wrong');
  });

  it('refuses the right code once it has expired', () => {
    expect(checkCode(row({ expiresAt: later(-1) }), 'right', now)).toBe('expired');
  });

  it('expires exactly at the expiry time', () => {
    expect(checkCode(row({ expiresAt: now }), 'right', now)).toBe('expired');
  });

  it('locks after 5 wrong tries, even for the right code', () => {
    expect(checkCode(row({ attempts: 4 }), 'right', now)).toBe('ok');
    expect(checkCode(row({ attempts: 5 }), 'right', now)).toBe('locked');
  });

  it('refuses a code that was already used', () => {
    expect(checkCode(row({ consumedAt: now }), 'right', now)).toBe('expired');
  });
});

describe('resendWait (a new code after 00:59)', () => {
  it('lets the first code go at once', () => {
    expect(resendWait(undefined, now)).toBe(0);
  });

  it('counts down the seconds left', () => {
    expect(resendWait(later(-10), now)).toBe(49);
  });

  it('lets a new code go after 59 seconds', () => {
    expect(resendWait(later(-59), now)).toBe(0);
  });
});

describe('newCode', () => {
  it('is 4 digits, leading zeros kept', () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^\d{4}$/);
  });
});

import { describe, expect, it } from 'vitest';
import { isValidEmail, isValidPassword, maskEmail, normalizeEmail } from './auth.js';

describe('isValidPassword (8 characters at least: letters, numbers or symbols, §8.1)', () => {
  it.each(['12345678', 'abcdefgh', 'a1!b2@c3', 'كلمةسر12'])('accepts %s', (p) => {
    expect(isValidPassword(p)).toBe(true);
  });

  it.each(['', '1234567', '        ', '12 34 56'])('refuses "%s"', (p) => {
    expect(isValidPassword(p)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it.each(['a@b.co', 'ahmed.z+1@gmail.com'])('accepts %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'ahmed', 'ahmed@', '@gmail.com', 'a b@c.com', 'a@b'])('refuses "%s"', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ahmed@Gmail.COM ')).toBe('ahmed@gmail.com');
  });
});

describe('maskEmail (where the reset code went, without showing the whole address)', () => {
  it.each([
    ['ahmed@gmail.com', 'a***d@gmail.com'],
    ['ab@x.com', 'a***@x.com'],
    ['a@x.com', 'a***@x.com'],
  ])('%s → %s', (email, want) => {
    expect(maskEmail(email)).toBe(want);
  });
});

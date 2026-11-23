import { GENERATED_PASSWORD_LENGTH, isValidPassword } from '@tawsela/shared';
import { generatePassword } from '../../../../src/modules/users/generated-password.js';

describe('generatePassword (admin-made accounts, contract §2)', () => {
  it('passes the password rules and has the fixed length', () => {
    const password = generatePassword();
    expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
    expect(isValidPassword(password)).toBe(true);
  });

  it('uses only characters that cannot be misread when read out (no 0/O, 1/l/I)', () => {
    for (let i = 0; i < 200; i++) expect(generatePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
  });

  it('is different every time', () => {
    const seen = new Set(Array.from({ length: 100 }, generatePassword));
    expect(seen.size).toBe(100);
  });
});

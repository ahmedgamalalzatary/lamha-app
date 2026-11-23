import { randomInt } from 'node:crypto';
import { GENERATED_PASSWORD_LENGTH } from '@tawsela/shared';

/** Letters and digits without the look-alikes 0/O/o, 1/l/I, so the password is passed on right. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** A password for an account the admin creates or resets (contract §2), shown to the admin once. */
export function generatePassword(): string {
  let password = '';
  for (let i = 0; i < GENERATED_PASSWORD_LENGTH; i++) password += ALPHABET[randomInt(ALPHABET.length)];
  return password;
}

import { randomInt } from 'node:crypto';
import { INVITE_CODE_LENGTH } from '@tawsela/shared';

/** Capitals and digits without the look-alikes 0/O and 1/I, so a code read aloud is typed right. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

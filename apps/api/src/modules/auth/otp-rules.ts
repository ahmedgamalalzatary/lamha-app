import { randomInt } from 'node:crypto';
import { OTP } from '@tawsela/shared';

export type CodeCheck = 'ok' | 'wrong' | 'expired' | 'locked';

interface CodeRow {
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

/** Whether a typed code (already hashed) opens this row (contract §8.1: 5 minutes, 5 tries). */
export function checkCode(row: CodeRow, givenHash: string, now: Date): CodeCheck {
  if (row.consumedAt || row.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (row.attempts >= OTP.maxAttempts) return 'locked';
  return row.codeHash === givenHash ? 'ok' : 'wrong';
}

/** Seconds left before another code may be sent ("إعادة إرسال الرمز خلال 00:59"). */
export function resendWait(lastSentAt: Date | undefined, now: Date): number {
  if (!lastSentAt) return 0;
  const passed = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);
  return Math.max(0, OTP.resendSeconds - passed);
}

/** A random 4-digit code; leading zeros count. */
export const newCode = () => String(randomInt(0, 10 ** OTP.length)).padStart(OTP.length, '0');

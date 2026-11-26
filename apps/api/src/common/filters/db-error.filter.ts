import { type ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ApiException } from '../api-exception.js';

/** MySQL errors that mean "someone else changed this at the same moment", not a broken server. */
const CLASHES = new Set(['ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2', 'ER_LOCK_DEADLOCK']);

const mysqlCode = (err: unknown): { code: string; message: string } | undefined => {
  for (let e = err, depth = 0; e && typeof e === 'object' && depth < 3; e = (e as { cause?: unknown }).cause, depth++) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && CLASHES.has(code)) return { code, message: String(message ?? '') };
  }
  return undefined;
};

/**
 * The answer for a write that lost a race the service's own checks could not see (review F12, F37):
 * a duplicate email or phone gets the same code the checks give; anything else is CONFLICT ("try again").
 */
export function dbConflict(err: unknown): ApiException | undefined {
  const found = mysqlCode(err);
  if (!found) return undefined;
  if (found.code === 'ER_DUP_ENTRY' && /users_email_unique/.test(found.message)) {
    return new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
  }
  if (found.code === 'ER_DUP_ENTRY' && /users_phone_unique/.test(found.message)) {
    return new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
  }
  if (found.code === 'ER_DUP_ENTRY' && /coupons_code_idx/.test(found.message)) {
    return new ApiException(HttpStatus.CONFLICT, 'COUPON_CODE_TAKEN', 'This code is already in use');
  }
  return new ApiException(HttpStatus.CONFLICT, 'CONFLICT', 'This changed at the same moment; try again');
}

/** Every other error goes to Nest's own handling. */
@Catch()
export class DbErrorFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(dbConflict(exception) ?? exception, host);
  }
}

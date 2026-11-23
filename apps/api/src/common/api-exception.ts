import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorCode } from '@tawsela/shared';

/**
 * A business error: the standard NestJS shape plus a `code` the apps translate (contract §7: every
 * text exists in Arabic and English, so the API sends a code, not a sentence).
 */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ApiErrorCode, message: string, extra: Record<string, number> = {}) {
    super({ statusCode: status, code, message, error: HttpStatus[status], ...extra }, status);
  }
}

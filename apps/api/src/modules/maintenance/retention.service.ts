import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lt } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { otpCodes, refreshTokens } from '../auth/auth.schema.js';
import { searchLogs } from '../catalog/catalog.schema.js';

/** Expired codes are kept a day (support can still see a "my code did not arrive" case), then go. */
const OTP_KEEP_MS = 24 * 3600_000;
/** Search words feed the week's trending list; a month is plenty. */
const SEARCH_KEEP_MS = 30 * 24 * 3600_000;

/**
 * Removes what has served its purpose (review F15): emailed codes, which hold a phone and an email,
 * a day after they expire, and refresh tokens once past their own expiry. A revoked token stays
 * until then, so a stolen copy still sets off the reuse alarm.
 */
@Injectable()
export class RetentionService {
  private readonly log = new Logger(RetentionService.name);

  constructor(@InjectDb() private readonly db: Db) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const now = Date.now();
    const [codes] = await this.db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date(now - OTP_KEEP_MS)));
    const [tokens] = await this.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date(now)));
    await this.db.delete(searchLogs).where(lt(searchLogs.createdAt, new Date(now - SEARCH_KEEP_MS)));
    if (codes.affectedRows || tokens.affectedRows) {
      this.log.log(`Removed ${codes.affectedRows} expired codes and ${tokens.affectedRows} expired sessions`);
    }
  }
}

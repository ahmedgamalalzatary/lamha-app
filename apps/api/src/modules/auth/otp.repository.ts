import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { OtpPurpose } from '@tawsela/shared';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { type OtpRow, otpCodes } from './auth.schema.js';

/** Emailed codes. Only the newest code for a phone and purpose counts. */
@Injectable()
export class OtpRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async latest(phone: string, purpose: OtpPurpose): Promise<OtpRow | undefined> {
    const [row] = await this.db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, purpose)))
      .orderBy(desc(otpCodes.id))
      .limit(1);
    return row;
  }

  async create(row: Omit<OtpRow, 'id' | 'attempts' | 'consumedAt'>): Promise<void> {
    await this.db.insert(otpCodes).values(row);
  }

  async addAttempt(id: number): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }

  /** Marks the code used; false when another request used it first. */
  async consume(id: number): Promise<boolean> {
    const [res] = await this.db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.id, id), isNull(otpCodes.consumedAt)));
    return res.affectedRows === 1;
  }
}

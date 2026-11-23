import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { type RefreshTokenRow, refreshTokens } from './auth.schema.js';

/** Refresh tokens (one per signed-in device). */
@Injectable()
export class SessionsRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(refreshTokens).values({ userId, tokenHash, expiresAt, createdAt: new Date() });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    return row;
  }

  /** Revokes one token; false when it was already revoked (someone else used it first). */
  async revoke(id: number): Promise<boolean> {
    const [res] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
    return res.affectedRows === 1;
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}

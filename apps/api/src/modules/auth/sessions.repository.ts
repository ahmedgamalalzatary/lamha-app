import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { ResultSetHeader } from 'mysql2';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { users } from '../users/users.schema.js';
import { type RefreshTokenRow, refreshTokens } from './auth.schema.js';

/** Refresh tokens (one per signed-in device). */
@Injectable()
export class SessionsRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  /**
   * Stores a new token only while the account is live, enabled and still at `version`, checked in
   * the same statement. A reset, disable or copied-token alarm that lands first makes it false, so
   * a sign-in or refresh racing one of them cannot leave a session behind.
   */
  async create(userId: number, version: number, tokenHash: string, expiresAt: Date): Promise<number | undefined> {
    const [res] = await this.db.execute<ResultSetHeader>(sql`
      INSERT INTO ${refreshTokens} (user_id, token_hash, session_version, expires_at, created_at)
      SELECT ${users.id}, ${tokenHash}, ${users.sessionVersion}, ${expiresAt}, ${new Date()} FROM ${users}
      WHERE ${users.id} = ${userId} AND ${users.sessionVersion} = ${version}
        AND ${users.deletedAt} IS NULL AND ${users.disabledAt} IS NULL`);
    return res.affectedRows === 1 ? res.insertId : undefined;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    return row;
  }

  async find(id: number): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.id, id));
    return row;
  }

  /** Records which token `id` was rotated into. */
  async setReplacedBy(id: number, replacedById: number): Promise<void> {
    await this.db.update(refreshTokens).set({ replacedById }).where(eq(refreshTokens.id, id));
  }

  /** Revokes one token; false when it was already revoked (someone else used it first). */
  async revoke(id: number): Promise<boolean> {
    const [res] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
    return res.affectedRows === 1;
  }

  /**
   * Revokes the account's tokens from before its current session version. Called after the version
   * moved on (reset, disable, deletion, copied-token alarm): a session issued at the new version in
   * between stays (review F07).
   */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE ${refreshTokens} SET revoked_at = ${new Date()}
      WHERE user_id = ${userId} AND revoked_at IS NULL
        AND session_version < (SELECT session_version FROM ${users} WHERE id = ${userId})`);
  }
}

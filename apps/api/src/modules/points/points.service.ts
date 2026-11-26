import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { type MyPoints, type PointsAdjustInput, pointsAdjustProblem, type PointsEntry, type PointsSettings, pointsWorth } from '@tawsela/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { users } from '../users/users.schema.js';
import { pointsSettings, type PointsSettingsRow, pointsTransactions, type PointsTransactionRow } from './points.schema.js';

const ROW = 1;
const codeOf = (id: number) => String(100000 + id);
/** The newest rows the app shows [Derived, as the wallet's]. */
const ENTRIES_SHOWN = 200;

const toSettings = (row: PointsSettingsRow): PointsSettings => ({ earnEvery: row.earnEvery, pointValue: row.pointValue, minimum: row.minimum });

/**
 * نقاطي (contract §8.16): the balance on the customer's row, every movement beside it, and the rules
 * (الإعدادات › النقاط). Every change locks the customer's row.
 */
@Injectable()
export class PointsService {
  constructor(@InjectDb() private readonly db: Db) {}

  async settings(tx: Db | Tx = this.db): Promise<PointsSettings> {
    const [row] = await tx.select().from(pointsSettings).where(eq(pointsSettings.id, ROW));
    // The migration inserts the row; a database without it gets the defaults back.
    if (!row) {
      await tx.insert(pointsSettings).values({ id: ROW }).onDuplicateKeyUpdate({ set: { id: ROW } });
      // A locking read sees the row another request may have just added; a plain read inside a
      // transaction keeps its old snapshot, misses it and would loop for ever.
      const [added] = await tx.select().from(pointsSettings).where(eq(pointsSettings.id, ROW)).for('share');
      return toSettings(added!);
    }
    return toSettings(row);
  }

  async updateSettings(change: Partial<PointsSettings>): Promise<PointsSettings> {
    await this.settings();
    if (Object.keys(change).length) await this.db.update(pointsSettings).set(change).where(eq(pointsSettings.id, ROW));
    return this.settings();
  }

  /** نقاطي: the balance, its value, the rules and the movements, newest first. */
  async mine(userId: number): Promise<MyPoints> {
    const rules = await this.settings();
    const balance = await this.balanceOf(this.db, userId);
    const rows = await this.db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(desc(pointsTransactions.id))
      .limit(ENTRIES_SHOWN);
    return { balance, worth: pointsWorth(balance, rules.pointValue), ...rules, entries: rows.map(toEntry) };
  }

  async balanceOf(tx: Db | Tx, userId: number): Promise<number> {
    const [user] = await tx.select({ balance: users.pointsBalance }).from(users).where(eq(users.id, userId));
    return user?.balance ?? 0;
  }

  /** "نقاطي" paying part of an order; the caller holds the customer's row lock. */
  async spend(tx: Tx, userId: number, orderId: number, points: number): Promise<void> {
    if (points <= 0) return;
    await this.move(tx, userId, { kind: 'deduct', reason: 'order', points, orderId });
  }

  /** A rejected or cancelled order's points, back at once [Derived from the wallet's rule]. */
  async refund(tx: Tx, userId: number, orderId: number, points: number): Promise<void> {
    if (points <= 0) return;
    await this.lock(tx, userId);
    await this.move(tx, userId, { kind: 'add', reason: 'refund', points, orderId });
  }

  /** What a delivered order earns (fixed when it was placed). */
  async earn(tx: Tx, userId: number, orderId: number, points: number): Promise<void> {
    if (points <= 0) return;
    await this.lock(tx, userId);
    await this.move(tx, userId, { kind: 'add', reason: 'order', points, orderId });
  }

  /** The admin adds or deducts with a reason; never below 0. Gives the new balance. */
  async adjust(adminId: number, customerId: number, input: PointsAdjustInput): Promise<{ balance: number; name: string }> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ balance: users.pointsBalance, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(and(eq(users.id, customerId), eq(users.role, 'customer'), isNull(users.deletedAt)))
        .for('update');
      if (!user) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No customer has this id');
      const note = input.note.trim();
      const problem = pointsAdjustProblem({ ...input, note }, user.balance);
      if (problem === 'balance') throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'POINTS_BALANCE', 'The customer has fewer points than this deduction');
      if (problem) throw new BadRequestException(`Invalid ${problem}`);
      const balance = await this.move(tx, customerId, { kind: input.kind, reason: 'admin', points: input.points, note, byUserId: adminId });
      return { balance, name: `${user.firstName} ${user.lastName}`.trim() };
    });
  }

  private async lock(tx: Tx, userId: number): Promise<void> {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
  }

  private async move(
    tx: Tx,
    userId: number,
    row: Pick<PointsTransactionRow, 'kind' | 'reason' | 'points'> & { note?: string; orderId?: number; byUserId?: number },
  ): Promise<number> {
    const change = row.kind === 'add' ? row.points : -row.points;
    await tx
      .update(users)
      .set({ pointsBalance: sql`${users.pointsBalance} + ${change}` })
      .where(eq(users.id, userId));
    await tx.insert(pointsTransactions).values({ userId, ...row });
    return this.balanceOf(tx, userId);
  }
}

function toEntry(row: PointsTransactionRow): PointsEntry {
  return {
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    points: row.points,
    note: row.note,
    orderCode: row.orderId === null ? null : codeOf(row.orderId),
    createdAt: row.createdAt.toISOString(),
  };
}

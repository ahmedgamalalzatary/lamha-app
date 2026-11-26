import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  adjustProblem,
  type CustomerAccount,
  type InviteCredit,
  type Vertical,
  type Wallet,
  type WalletAdjustInput,
  type WalletEntry,
  type WalletPlan,
  walletPlan,
} from '@tawsela/shared';
import { and, asc, desc, eq, gt, inArray, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { users } from '../users/users.schema.js';
import { inviteCreditUses, inviteCredits, type InviteCreditRow, walletTransactions, type WalletTransactionRow } from './wallet.schema.js';

const cents = (n: number) => Math.round(n * 100) / 100;
/** "#506898": six digits, as the orders read. */
const codeOf = (id: number) => String(100000 + id);
/** LIKE pattern for "contains": % and _ in the text are matched as themselves. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/** The newest rows of حركة المحفظة the app shows [Derived: no paging until a wallet holds more]. */
const ENTRIES_SHOWN = 200;

/** Invite money given to a wallet (§8.17). */
export interface Grant {
  reason: 'invite_reward' | 'invite_welcome';
  amount: number;
  inviteId: number;
  perOrder: number | null;
  expiresAt: Date | null;
}

const NO_PLAN: WalletPlan = { paid: 0, regular: 0, credits: [] };

/**
 * The wallet (contract §8.15): its balance on the customer's row and every movement beside it. Part of
 * the balance may be invite money (§8.17), kept piece by piece with its own limit and expiry. Every
 * change locks the customer's row, so a payment, a refund and an adjustment never cross.
 */
@Injectable()
export class WalletService {
  private readonly log = new Logger(WalletService.name);

  constructor(@InjectDb() private readonly db: Db) {}

  /** حركة المحفظة: the balance and the movements, newest first. */
  async mine(userId: number): Promise<Wallet> {
    await this.db.transaction((tx) => this.expire(tx, userId));
    const balance = await this.balanceOf(this.db, userId);
    const rows = await this.db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.id))
      .limit(ENTRIES_SHOWN);
    return { balance, entries: rows.map(toEntry) };
  }

  async balanceOf(tx: Db | Tx, userId: number): Promise<number> {
    const [user] = await tx.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return user?.balance ?? 0;
  }

  /** The invite money still in the wallet. */
  async credits(tx: Db | Tx, userId: number): Promise<InviteCreditRow[]> {
    return tx
      .select()
      .from(inviteCredits)
      .where(and(eq(inviteCredits.userId, userId), gt(inviteCredits.left, 0)))
      .orderBy(asc(inviteCredits.id));
  }

  /**
   * How "رصيد المحفظة" would pay `total` on an order of this kind (all it can with no total), after
   * taking out invite money that expired. Locks the customer's row.
   */
  async plan(tx: Tx, userId: number, vertical: Vertical, total = Number.POSITIVE_INFINITY): Promise<WalletPlan> {
    await this.expire(tx, userId);
    const balance = await this.balanceOf(tx, userId);
    const credits = await this.credits(tx, userId);
    const inCredits = cents(credits.reduce((n, c) => n + c.left, 0));
    return walletPlan(Math.max(0, cents(balance - inCredits)), credits.map(toCredit), vertical, total);
  }

  /** "رصيد المحفظة" paying part or all of an order by its plan; the caller holds the customer's row lock. */
  async pay(tx: Tx, userId: number, orderId: number, plan: WalletPlan = NO_PLAN): Promise<void> {
    if (plan.paid <= 0) return;
    for (const use of plan.credits) {
      await tx
        .update(inviteCredits)
        .set({ left: sql`${inviteCredits.left} - ${use.amount}` })
        .where(eq(inviteCredits.id, use.id));
      await tx.insert(inviteCreditUses).values({ orderId, creditId: use.id, amount: use.amount });
    }
    await this.move(tx, userId, { kind: 'deduct', reason: 'order', amount: plan.paid, orderId });
  }

  /** A rejected or cancelled order's wallet money, back at once [Owner, 2026-11-26]; invite money to its piece. */
  async refund(tx: Tx, userId: number, orderId: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.lock(tx, userId);
    const uses = await tx.select().from(inviteCreditUses).where(eq(inviteCreditUses.orderId, orderId));
    for (const use of uses) {
      await tx
        .update(inviteCredits)
        .set({ left: sql`${inviteCredits.left} + ${use.amount}` })
        .where(eq(inviteCredits.id, use.creditId));
    }
    if (uses.length) await tx.delete(inviteCreditUses).where(eq(inviteCreditUses.orderId, orderId));
    await this.move(tx, userId, { kind: 'add', reason: 'refund', amount, orderId });
  }

  /** Invite money into the wallet (§8.17): the inviter's reward or the friend's welcome money. */
  async grant(tx: Tx, userId: number, grant: Grant): Promise<void> {
    if (grant.amount <= 0) return;
    await this.lock(tx, userId);
    const amount = cents(grant.amount);
    await tx.insert(inviteCredits).values({
      userId,
      kind: grant.reason === 'invite_reward' ? 'reward' : 'welcome',
      inviteId: grant.inviteId,
      amount,
      left: amount,
      perOrder: grant.perOrder,
      expiresAt: grant.expiresAt,
    });
    await this.move(tx, userId, { kind: 'add', reason: grant.reason, amount });
  }

  /** Takes out invite money past its date, one row per piece (§8.17). */
  async expire(tx: Tx, userId: number): Promise<void> {
    const due = await tx
      .select({ id: inviteCredits.id })
      .from(inviteCredits)
      .where(and(eq(inviteCredits.userId, userId), gt(inviteCredits.left, 0), lte(inviteCredits.expiresAt, new Date())))
      .limit(1);
    if (!due.length) return;
    await this.lock(tx, userId);
    const expired = await tx
      .select()
      .from(inviteCredits)
      .where(and(eq(inviteCredits.userId, userId), gt(inviteCredits.left, 0), lte(inviteCredits.expiresAt, new Date())));
    for (const credit of expired) {
      await tx.update(inviteCredits).set({ left: 0 }).where(eq(inviteCredits.id, credit.id));
      await this.move(tx, userId, { kind: 'deduct', reason: 'invite_expired', amount: credit.left });
    }
  }

  /** Every hour, every wallet with invite money past its date, so balances in العملاء stay right. */
  @Cron(CronExpression.EVERY_HOUR)
  async expireAll(): Promise<void> {
    const rows = await this.db
      .selectDistinct({ userId: inviteCredits.userId })
      .from(inviteCredits)
      .where(and(gt(inviteCredits.left, 0), lte(inviteCredits.expiresAt, new Date())));
    for (const { userId } of rows) {
      await this.db.transaction((tx) => this.expire(tx, userId)).catch((err: unknown) => this.log.warn(`Invite money of ${userId} not expired: ${String(err)}`));
    }
  }

  // The admin's side (§11 العملاء).

  /** العملاء: customers matching the name, phone or email, newest first. */
  async customers(q?: string): Promise<CustomerAccount[]> {
    const where: (SQL | undefined)[] = [eq(users.role, 'customer'), isNull(users.deletedAt)];
    const query = q?.trim();
    if (query) {
      const pattern = contains(query);
      where.push(or(like(sql`concat(${users.firstName}, ' ', ${users.lastName})`, pattern), like(users.phone, pattern), like(users.email, pattern)));
    }
    const rows = await this.db
      .select()
      .from(users)
      .where(and(...where))
      .orderBy(desc(users.id))
      .limit(50);
    return rows.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      email: u.email,
      walletBalance: u.walletBalance,
      pointsBalance: u.pointsBalance,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /**
   * Adds or deducts with a reason; never below 0 [Owner, 2026-11-26]. A deduction takes the regular
   * money first, then invite money, the soonest to expire first [Derived]. Gives the new balance.
   */
  async adjust(adminId: number, customerId: number, input: WalletAdjustInput): Promise<{ balance: number; name: string }> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(and(eq(users.id, customerId), eq(users.role, 'customer'), isNull(users.deletedAt)))
        .for('update');
      if (!user) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No customer has this id');
      await this.expire(tx, customerId);
      const before = await this.balanceOf(tx, customerId);
      const note = input.note.trim();
      const problem = adjustProblem({ ...input, note }, before);
      if (problem === 'balance') throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'WALLET_BALANCE', 'The wallet holds less than this deduction');
      if (problem) throw new BadRequestException(`Invalid ${problem}`);
      if (input.kind === 'deduct') await this.takeFromCredits(tx, customerId, before, input.amount);
      const balance = await this.move(tx, customerId, { kind: input.kind, reason: 'admin', amount: input.amount, note, byUserId: adminId });
      return { balance, name: `${user.firstName} ${user.lastName}`.trim() };
    });
  }

  /** What a deduction takes from invite money once the regular money runs out. */
  private async takeFromCredits(tx: Tx, userId: number, balance: number, amount: number): Promise<void> {
    const credits = await this.credits(tx, userId);
    const regular = cents(balance - credits.reduce((n, c) => n + c.left, 0));
    let rest = cents(amount - Math.max(0, regular));
    const order = [...credits].sort((a, b) => (a.expiresAt?.getTime() ?? Infinity) - (b.expiresAt?.getTime() ?? Infinity));
    for (const c of order) {
      if (rest <= 0) break;
      const take = cents(Math.min(c.left, rest));
      await tx
        .update(inviteCredits)
        .set({ left: sql`${inviteCredits.left} - ${take}` })
        .where(eq(inviteCredits.id, c.id));
      rest = cents(rest - take);
    }
  }

  /** What each customer still has in invite money (رصيدك المتاح on ادعُ أصدقاءك). */
  async inviteMoney(tx: Db | Tx, userIds: number[]): Promise<Map<number, number>> {
    const money = new Map<number, number>();
    if (!userIds.length) return money;
    const rows = await tx
      .select({ userId: inviteCredits.userId, left: sql<string>`sum(${inviteCredits.left})` })
      .from(inviteCredits)
      .where(inArray(inviteCredits.userId, userIds))
      .groupBy(inviteCredits.userId);
    for (const r of rows) money.set(r.userId, cents(Number(r.left)));
    return money;
  }

  private async lock(tx: Tx, userId: number): Promise<void> {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
  }

  /** One movement and the balance beside it; gives the new balance. */
  private async move(
    tx: Tx,
    userId: number,
    row: Pick<WalletTransactionRow, 'kind' | 'reason' | 'amount'> & { note?: string; orderId?: number; byUserId?: number },
  ): Promise<number> {
    const amount = cents(row.amount);
    const change = row.kind === 'add' ? amount : -amount;
    await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${change}` })
      .where(eq(users.id, userId));
    await tx.insert(walletTransactions).values({ userId, ...row, amount });
    return this.balanceOf(tx, userId);
  }
}

const toCredit = (c: InviteCreditRow): InviteCredit => ({ id: c.id, left: c.left, perOrder: c.perOrder, expiresAt: c.expiresAt?.toISOString() ?? null });

function toEntry(row: WalletTransactionRow): WalletEntry {
  return {
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    amount: row.amount,
    note: row.note,
    orderCode: row.orderId === null ? null : codeOf(row.orderId),
    createdAt: row.createdAt.toISOString(),
  };
}

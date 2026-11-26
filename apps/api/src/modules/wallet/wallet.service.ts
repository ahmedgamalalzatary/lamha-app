import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { adjustProblem, type CustomerAccount, type Wallet, type WalletAdjustInput, type WalletEntry } from '@tawsela/shared';
import { and, desc, eq, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { users } from '../users/users.schema.js';
import { walletTransactions, type WalletTransactionRow } from './wallet.schema.js';

const cents = (n: number) => Math.round(n * 100) / 100;
/** "#506898": six digits, as the orders read. */
const codeOf = (id: number) => String(100000 + id);
/** LIKE pattern for "contains": % and _ in the text are matched as themselves. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/** The newest rows of حركة المحفظة the app shows [Derived: no paging until a wallet holds more]. */
const ENTRIES_SHOWN = 200;

/**
 * The wallet (contract §8.15): its balance on the customer's row and every movement beside it. Every
 * change locks the customer's row, so a payment, a refund and an adjustment never cross.
 */
@Injectable()
export class WalletService {
  constructor(@InjectDb() private readonly db: Db) {}

  /** حركة المحفظة: the balance and the movements, newest first. */
  async mine(userId: number): Promise<Wallet> {
    const [user] = await this.db.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
    const rows = await this.db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.id))
      .limit(ENTRIES_SHOWN);
    return { balance: user?.balance ?? 0, entries: rows.map(toEntry) };
  }

  /** The balance inside a transaction that already locked the customer's row (checkout). */
  async balanceOf(tx: Db | Tx, userId: number): Promise<number> {
    const [user] = await tx.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return user?.balance ?? 0;
  }

  /** "رصيد المحفظة" paying part or all of an order; the caller holds the customer's row lock. */
  async pay(tx: Tx, userId: number, orderId: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.move(tx, userId, { kind: 'deduct', reason: 'order', amount, orderId });
  }

  /** A rejected or cancelled order's wallet money, back at once [Owner, 2026-11-26]. */
  async refund(tx: Tx, userId: number, orderId: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    await this.move(tx, userId, { kind: 'add', reason: 'refund', amount, orderId });
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

  /** Adds or deducts with a reason; never below 0 [Owner, 2026-11-26]. Gives the new balance. */
  async adjust(adminId: number, customerId: number, input: WalletAdjustInput): Promise<{ balance: number; name: string }> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ balance: users.walletBalance, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(and(eq(users.id, customerId), eq(users.role, 'customer'), isNull(users.deletedAt)))
        .for('update');
      if (!user) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No customer has this id');
      const note = input.note.trim();
      const problem = adjustProblem({ ...input, note }, user.balance);
      if (problem === 'balance') throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'WALLET_BALANCE', 'The wallet holds less than this deduction');
      if (problem) throw new BadRequestException(`Invalid ${problem}`);
      const balance = await this.move(tx, customerId, { kind: input.kind, reason: 'admin', amount: input.amount, note, byUserId: adminId });
      return { balance, name: `${user.firstName} ${user.lastName}`.trim() };
    });
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

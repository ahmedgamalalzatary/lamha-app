import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AdminDriverMoney,
  cairoDayRange,
  type DriverFine,
  type DriverHistory,
  type DriverMoney,
  type DriverPoints,
  type DriverPointsEntry,
  type FineInput,
  formatMoney,
  netEarnings,
  notice,
  type OrderStatus,
} from '@tawsela/shared';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { stores } from '../catalog/catalog.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { orderLines, orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';
import { DriverSettingsService } from './driver-settings.service.js';
import { driverFines, driverPayouts, drivers } from './drivers.schema.js';

/** طلباتى shows the orders he finished: delivered, or stopped after he had it. */
const FINISHED: OrderStatus[] = ['delivered', 'cancelled', 'rejected'];
const HISTORY_LIMIT = 500;
const LIST_LIMIT = 200;

const cents = (n: number) => Math.round(n * 100) / 100;
const codeOf = (id: number) => String(100000 + id);
const orderRef = (id: number | null) => (id === null ? null : { id, code: codeOf(id) });
const driverNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'No delivery man has this id');
/** His earning on an order taken before Phase 24 had none fixed: the fee the customer was asked for. */
const earningSql = sql<string>`coalesce(${orders.driverFee}, ${orders.deliveryFee} + ${orders.deliveryDiscount})`;

/**
 * The delivery man's money (contract §10, §8.7; owner's answers 2026-11-26): طلباتى with its totals,
 * فواتيري (his delivery earnings and speed points cash less his fines), his speed points until the
 * admin pays them out, and the admin's fines.
 */
@Injectable()
export class DriverMoneyService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly settings: DriverSettingsService,
    private readonly notices: NotificationsService,
  ) {}

  /** طلباتى: his finished orders placed in the Cairo days, newest first, and the grey panel's totals. */
  async history(driverId: number, from: string, to: string): Promise<DriverHistory> {
    const range = cairoDayRange(from, to);
    const rows = await this.db
      .select({ order: orders, store: stores.name, earning: earningSql })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(and(eq(orders.driverId, driverId), inArray(orders.status, FINISHED), gte(orders.createdAt, range.from), lt(orders.createdAt, range.to)))
      .orderBy(desc(orders.id))
      .limit(HISTORY_LIMIT);
    const ids = rows.map((r) => r.order.id);
    const counts = new Map<number, number>();
    if (ids.length) {
      const lines = await this.db.select({ orderId: orderLines.orderId, quantity: orderLines.quantity }).from(orderLines).where(inArray(orderLines.orderId, ids));
      for (const { orderId, quantity } of lines) counts.set(orderId, (counts.get(orderId) ?? 0) + quantity);
    }
    const cards = rows.map(({ order, store, earning }) => ({
      id: order.id,
      code: codeOf(order.id),
      status: order.status,
      store: { name: store },
      count: counts.get(order.id) ?? 0,
      earning: order.status === 'delivered' ? Number(earning) : null,
      createdAt: order.createdAt.toISOString(),
    }));
    // The panel's totals cover the whole range, not only the cards sent.
    const [totals] = await this.db
      .select({ earnings: sql<string | null>`sum(${earningSql})`, delivered: sql<string>`count(*)` })
      .from(orders)
      .where(and(eq(orders.driverId, driverId), eq(orders.status, 'delivered'), gte(orders.createdAt, range.from), lt(orders.createdAt, range.to)));
    return { orders: cards, earnings: cents(Number(totals?.earnings ?? 0)), delivered: Number(totals?.delivered ?? 0) };
  }

  /** فواتيري. */
  async money(driverId: number): Promise<DriverMoney> {
    const [earned] = await this.db
      .select({ total: sql<string | null>`sum(${earningSql})` })
      .from(orders)
      .where(and(eq(orders.driverId, driverId), eq(orders.status, 'delivered')));
    const [fined] = await this.db.select({ total: sql<string | null>`sum(${driverFines.amount})` }).from(driverFines).where(eq(driverFines.driverId, driverId));
    const points = await this.pointsTotals(this.db, driverId);
    const { pointValue } = await this.settings.get();
    const earnings = cents(Number(earned?.total ?? 0));
    const pointsCash = cents(points.paidValue + points.balance * pointValue);
    const fines = cents(Number(fined?.total ?? 0));
    return { net: netEarnings({ earnings, pointsCash, fines }), earnings, pointsCash, fines, list: await this.fines(driverId) };
  }

  /** نقاطي: the balance at today's value, the levels, and his points and payouts, newest first. */
  async points(driverId: number): Promise<DriverPoints> {
    const { balance } = await this.pointsTotals(this.db, driverId);
    const { pointValue, speedLevels } = await this.settings.get();
    const earned = await this.db
      .select({ id: orders.id, points: orders.driverPoints, minutesPerKm: orders.minutesPerKm, at: orders.createdAt })
      .from(orders)
      .where(and(eq(orders.driverId, driverId), eq(orders.status, 'delivered'), sql`${orders.driverPoints} > 0`))
      .orderBy(desc(orders.id))
      .limit(LIST_LIMIT);
    const paid = await this.db.select().from(driverPayouts).where(eq(driverPayouts.driverId, driverId)).orderBy(desc(driverPayouts.id)).limit(LIST_LIMIT);
    // Payouts first, so one in the same second as an order's points still shows above it.
    const entries: DriverPointsEntry[] = [
      ...paid.map((p) => ({ kind: 'payout' as const, points: p.points, value: p.value, order: null, minutesPerKm: null, createdAt: p.createdAt.toISOString() })),
      ...earned.map((o) => ({ kind: 'order' as const, points: o.points, value: null, order: orderRef(o.id), minutesPerKm: o.minutesPerKm, createdAt: o.at.toISOString() })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { balance, value: cents(balance * pointValue), pointValue, levels: speedLevels, entries };
  }

  // The admin's side.

  async adminMoney(driverId: number): Promise<AdminDriverMoney> {
    await this.driver(driverId);
    const money = await this.money(driverId);
    const { balance, value } = await this.points(driverId);
    return { ...money, points: { balance, value } };
  }

  /** A fine with its reason, maybe about one of his orders; he is told at once. */
  async fine(adminId: number, driverId: number, input: FineInput): Promise<DriverFine> {
    await this.driver(driverId);
    if (input.orderId !== undefined) {
      const [order] = await this.db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.driverId, driverId)));
      if (!order) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No order of his has this id');
    }
    const reason = input.reason.trim();
    const [made] = await this.db.insert(driverFines).values({ driverId, orderId: input.orderId ?? null, amount: input.amount, reason, byId: adminId }).$returningId();
    this.notices.tell([driverId], (locale) => notice('driver_fine', locale, { amount: formatMoney(input.amount, locale), reason }), { path: '/driver-money', keep: true });
    const [fine] = await this.fineRows(eq(driverFines.id, made!.id));
    return fine!;
  }

  /** A fine made by mistake. */
  async removeFine(driverId: number, fineId: number): Promise<DriverFine> {
    const [fine] = await this.fineRows(and(eq(driverFines.id, fineId), eq(driverFines.driverId, driverId)));
    if (!fine) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No fine of his has this id');
    await this.db.delete(driverFines).where(eq(driverFines.id, fineId));
    return fine;
  }

  /**
   * "تم الصرف": the points the admin saw and confirmed, at today's value; his row is locked so two
   * taps pay once. Points earned since he looked stay for the next payout; fewer than he confirmed
   * means the balance changed under him (409 POINTS_CHANGED).
   */
  async payout(adminId: number, driverId: number, points: number): Promise<{ points: number; value: number }> {
    await this.driver(driverId);
    return this.db.transaction(async (tx) => {
      await tx.select({ id: drivers.userId }).from(drivers).where(eq(drivers.userId, driverId)).for('update');
      const { balance } = await this.pointsTotals(tx, driverId);
      if (balance <= 0) throw new ApiException(HttpStatus.CONFLICT, 'NO_POINTS', 'He has no speed points to pay out');
      if (points > balance) throw new ApiException(HttpStatus.CONFLICT, 'POINTS_CHANGED', 'His balance changed; look again');
      const { pointValue } = await this.settings.get(tx);
      const value = cents(points * pointValue);
      await tx.insert(driverPayouts).values({ driverId, points, value, byId: adminId });
      return { points, value };
    });
  }

  // Helpers.

  private fines(driverId: number): Promise<DriverFine[]> {
    return this.fineRows(eq(driverFines.driverId, driverId));
  }

  private async fineRows(where: ReturnType<typeof and>): Promise<DriverFine[]> {
    const rows = await this.db.select().from(driverFines).where(where).orderBy(desc(driverFines.id)).limit(LIST_LIMIT);
    return rows.map((f) => ({ id: f.id, amount: f.amount, reason: f.reason, order: orderRef(f.orderId), createdAt: f.createdAt.toISOString() }));
  }

  /** One statement, so a delivery or a payout between two reads can't make the balance go negative. */
  private async pointsTotals(tx: Db | Tx, driverId: number): Promise<{ balance: number; paidValue: number }> {
    const [row] = await tx
      .select({
        earned: sql<string | null>`(select sum(${orders.driverPoints}) from ${orders} where ${orders.driverId} = ${driverId} and ${orders.status} = 'delivered')`,
        paid: sql<string | null>`(select sum(${driverPayouts.points}) from ${driverPayouts} where ${driverPayouts.driverId} = ${driverId})`,
        paidValue: sql<string | null>`(select sum(${driverPayouts.value}) from ${driverPayouts} where ${driverPayouts.driverId} = ${driverId})`,
      })
      .from(sql`(select 1) as one`);
    return { balance: Number(row?.earned ?? 0) - Number(row?.paid ?? 0), paidValue: Number(row?.paidValue ?? 0) };
  }

  private async driver(id: number): Promise<void> {
    const [row] = await this.db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.role, 'driver')));
    if (!row) throw driverNotFound();
  }
}

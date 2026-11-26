import { HttpStatus, Injectable } from '@nestjs/common';
import {
  canStartShift,
  cashDue,
  type CreatedAccount,
  type DeliveryFeeRule,
  driverEarning,
  minutesPerKm,
  speedPoints,
  type DriverAccount,
  type DriverAction,
  type DriverOffer,
  type DriverOrder,
  type DriverOrderDetails,
  type DriverSettings,
  type DriverShiftState,
  DRIVER_SOCKET_EVENTS,
  customerStatusNotice,
  driverStep,
  notice,
  type GeneratedPassword,
  type OrderStatus,
  shiftAt,
  type ShiftTime,
  type SkipResult,
  skipOutcome,
  startWindow,
  type WeekSchedule,
} from '@tawsela/shared';
import { and, asc, desc, eq, gt, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { addresses, zones } from '../addresses/addresses.schema.js';
import { nameOf } from '../audit/audit.service.js';
import { hashPassword } from '../auth/password.js';
import { SessionsRepository } from '../auth/sessions.repository.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { stores } from '../catalog/catalog.schema.js';
import { locationOf } from '../catalog/store-view.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { OrdersGateway } from '../orders/orders.gateway.js';
import { orderEvents, orderLines, type OrderRow, orders } from '../orders/orders.schema.js';
import { generatePassword } from '../users/generated-password.js';
import { toStaffAccount } from '../users/staff-account.js';
import { UsersRepository } from '../users/users.repository.js';
import { type UserRow, users } from '../users/users.schema.js';
import { DriverSettingsService } from './driver-settings.service.js';
import type { CreateAdminDto } from '../admins/dto/admins.dto.js';
import { type DriverRow, drivers, orderSkips, type ShiftRow, shifts } from './drivers.schema.js';

/** An order waiting for a delivery man: accepted by a store the app's captains deliver for, nobody on it yet. */
const OFFER_STATUSES: OrderStatus[] = ['preparing', 'ready'];
/** His orders on الطلبات الحالية: taken and not yet delivered. */
const CURRENT_STATUSES: OrderStatus[] = ['preparing', 'ready', 'out_for_delivery'];

const storeZones = alias(zones, 'store_zones');
const customerZones = alias(zones, 'customer_zones');
const codeOf = (id: number) => String(100000 + id);
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
const minutesAfter = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

const conflict = (code: 'OFFER_TAKEN' | 'SHIFT_NOT_OPEN' | 'NOT_ON_SHIFT' | 'DRIVER_BLOCKED' | 'EXTEND_LIMIT' | 'ORDER_STATUS', message: string) =>
  new ApiException(HttpStatus.CONFLICT, code, message);
const orderNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No order of yours has this id');
const driverNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'No delivery man has this id');

const isOffer = (order: Pick<OrderRow, 'status' | 'mode' | 'driverId'>, deliveredBy: string) =>
  OFFER_STATUSES.includes(order.status) && order.mode === 'delivery' && order.driverId === null && deliveredBy === 'platform';

/**
 * The delivery man's side (contract §10, §15.1 #5): shifts from the weekly schedule, offers every
 * working man sees at once (the first to accept takes it), skips in a row with a warning and a
 * block, and his steps to delivered. And the admin's: accounts, schedules, starting a shift for
 * him, and assigning an order (§11 المندوبين, الطلبات).
 */
@Injectable()
export class DriversService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly settings: DriverSettingsService,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly live: OrdersGateway,
    private readonly notices: NotificationsService,
    private readonly orders: OrdersService,
  ) {}

  // Shifts.

  async state(driverId: number): Promise<DriverShiftState> {
    const now = new Date();
    const rules = await this.settings.get();
    const me = await this.driverRow(this.db, driverId);
    const active = await this.activeShift(this.db, driverId, now);
    const blockedUntil = me.blockedUntil && me.blockedUntil > now ? me.blockedUntil : null;
    const common = {
      blockedUntil: iso(blockedUntil),
      skipsInRow: me.skipsInRow,
      offerSeconds: rules.offerSeconds,
      extendMinutes: rules.extendMinutes,
      week: me.schedule ?? rules.schedule,
    };
    if (active) {
      return {
        ...common,
        status: 'on',
        shift: { startsAt: active.startsAt.toISOString(), endsAt: active.endsAt.toISOString() },
        startFrom: null,
        startTo: null,
        canStart: false,
        endsAt: active.endsAt.toISOString(),
        extensionsLeft: Math.max(0, rules.extendMax - active.extensions),
      };
    }
    const shift = await this.nextShift(this.db, me, rules, now);
    const window = shift && startWindow(shift, rules);
    return {
      ...common,
      status: 'off',
      shift: shift && { startsAt: shift.startsAt.toISOString(), endsAt: shift.endsAt.toISOString() },
      startFrom: iso(window?.from),
      startTo: iso(window?.to),
      canStart: !!shift && canStartShift(shift, now, rules),
      endsAt: null,
      extensionsLeft: 0,
    };
  }

  /**
   * "بدء نوبة العمل": from 30 minutes before the shift until 15 after it starts. After that only the
   * admin starts it for him (`byAdminId`), from the same opening time until the shift ends.
   */
  async start(driverId: number, byAdminId?: number): Promise<DriverShiftState> {
    await this.db.transaction(async (tx) => {
      const me = await this.driverRow(tx, driverId, true);
      const now = new Date();
      if (await this.activeShift(tx, driverId, now)) return;
      const rules = await this.settings.get(tx);
      const shift = await this.nextShift(tx, me, rules, now);
      const open = shift && (byAdminId === undefined ? canStartShift(shift, now, rules) : now >= startWindow(shift, rules).from);
      if (!shift || !open) throw conflict('SHIFT_NOT_OPEN', 'This shift cannot be started now');
      await tx.insert(shifts).values({ driverId, startsAt: shift.startsAt, endsAt: shift.endsAt, startedAt: now, startedById: byAdminId ?? null });
    });
    return this.state(driverId);
  }

  /** "تمديد": +60 minutes, at most 3 times a shift (the admin's numbers). */
  async extend(driverId: number): Promise<DriverShiftState> {
    await this.db.transaction(async (tx) => {
      await this.driverRow(tx, driverId, true);
      const active = await this.activeShift(tx, driverId, new Date());
      if (!active) throw conflict('NOT_ON_SHIFT', 'No shift is running');
      const rules = await this.settings.get(tx);
      if (active.extensions >= rules.extendMax) throw conflict('EXTEND_LIMIT', 'No extensions are left this shift');
      await tx
        .update(shifts)
        .set({ endsAt: minutesAfter(active.endsAt, rules.extendMinutes), extensions: active.extensions + 1 })
        .where(eq(shifts.id, active.id));
    });
    return this.state(driverId);
  }

  /** "إنهاء نوبة العمل": no new offers; the orders he holds stay his. */
  async end(driverId: number): Promise<DriverShiftState> {
    await this.db.transaction(async (tx) => {
      await this.driverRow(tx, driverId, true);
      const active = await this.activeShift(tx, driverId, new Date());
      if (!active) throw conflict('NOT_ON_SHIFT', 'No shift is running');
      await tx.update(shifts).set({ endedAt: new Date() }).where(eq(shifts.id, active.id));
    });
    return this.state(driverId);
  }

  // Offers.

  /** The offers he sees: none off shift or while blocked; never one he skipped. Oldest first. */
  async offers(driverId: number): Promise<DriverOffer[]> {
    const now = new Date();
    const me = await this.driverRow(this.db, driverId);
    if (me.blockedUntil && me.blockedUntil > now) return [];
    if (!(await this.activeShift(this.db, driverId, now))) return [];
    const rows = await this.db
      .select({ order: orders, store: { name: stores.name }, storeArea: storeZones.name, area: customerZones.name })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .leftJoin(storeZones, eq(storeZones.id, stores.zoneId))
      .leftJoin(addresses, eq(addresses.id, orders.addressId))
      .leftJoin(customerZones, eq(customerZones.id, addresses.zoneId))
      .where(
        and(
          inArray(orders.status, OFFER_STATUSES),
          eq(orders.mode, 'delivery'),
          isNull(orders.driverId),
          eq(stores.deliveredBy, 'platform'),
          sql`not exists (select 1 from ${orderSkips} where ${orderSkips.orderId} = ${orders.id} and ${orderSkips.driverId} = ${driverId})`,
        ),
      )
      .orderBy(asc(orders.id))
      .limit(50);
    const ids = rows.map((r) => r.order.id);
    const counts = await this.counts(this.db, ids);
    const accepted = new Map<number, Date>();
    if (ids.length) {
      const events = await this.db
        .select({ orderId: orderEvents.orderId, at: orderEvents.at })
        .from(orderEvents)
        .where(and(inArray(orderEvents.orderId, ids), eq(orderEvents.status, 'preparing')));
      for (const e of events) accepted.set(e.orderId, e.at);
    }
    return rows.map(({ order, store, storeArea, area }) => ({
      id: order.id,
      code: codeOf(order.id),
      store: { name: store.name, area: storeArea },
      area,
      count: counts.get(order.id) ?? 0,
      itemsTotal: order.itemsTotal,
      storeFromDriver: order.storeFromDriver,
      total: cashDue(order),
      deliveryFee: order.deliveryFee,
      distanceKm: order.distanceKm,
      note: order.note,
      offeredAt: (accepted.get(order.id) ?? order.createdAt).toISOString(),
    }));
  }

  /**
   * "قبول": the order row is locked, so of several men tapping at once one takes it and the rest get
   * OFFER_TAKEN. Taking an order starts his skips in a row again.
   */
  async accept(driverId: number, orderId: number): Promise<DriverOrderDetails> {
    const order = await this.db.transaction(async (tx) => {
      const me = await this.driverRow(tx, driverId, true);
      const now = new Date();
      if (me.blockedUntil && me.blockedUntil > now) throw conflict('DRIVER_BLOCKED', 'Blocked for skipping offers');
      if (!(await this.activeShift(tx, driverId, now))) throw conflict('NOT_ON_SHIFT', 'Offers need a shift running now');
      const order = await this.lockOffer(tx, orderId);
      // What he earns on it is fixed now, by his own fee rule if he has one (§8.7).
      await tx.update(orders).set({ driverId, takenAt: now, driverFee: driverEarning(order, feeRuleOf(me)) }).where(eq(orders.id, orderId));
      await tx.update(drivers).set({ skipsInRow: 0 }).where(eq(drivers.userId, driverId));
      return order;
    });
    this.live.toDrivers(DRIVER_SOCKET_EVENTS.offerGone, { id: orderId });
    this.live.orderChanged(order, { id: orderId });
    return this.details(driverId, orderId);
  }

  /** "تخطي": he does not see it again. Skips in a row bring a warning, then a block that starts the count again. */
  async skip(driverId: number, orderId: number): Promise<SkipResult> {
    const result = await this.db.transaction(async (tx) => {
      const me = await this.driverRow(tx, driverId, true);
      await this.lockOffer(tx, orderId);
      const [already] = await tx
        .select({ at: orderSkips.at })
        .from(orderSkips)
        .where(and(eq(orderSkips.orderId, orderId), eq(orderSkips.driverId, driverId)));
      const now = new Date();
      const blocked = me.blockedUntil && me.blockedUntil > now ? me.blockedUntil : null;
      if (already) return { outcome: null, skipsInRow: me.skipsInRow, blockedUntil: iso(blocked) };
      await tx.insert(orderSkips).values({ orderId, driverId });
      const rules = await this.settings.get(tx);
      const skipsInRow = me.skipsInRow + 1;
      const outcome = skipOutcome(skipsInRow, rules);
      if (outcome === 'block') {
        // Whole seconds, as the column keeps it.
        const until = minutesAfter(now, rules.blockMinutes);
        until.setMilliseconds(0);
        await tx.update(drivers).set({ skipsInRow: 0, blockedUntil: until }).where(eq(drivers.userId, driverId));
        return { outcome, skipsInRow: 0, blockedUntil: until.toISOString() };
      }
      await tx.update(drivers).set({ skipsInRow }).where(eq(drivers.userId, driverId));
      return { outcome, skipsInRow, blockedUntil: iso(blocked) };
    });
    // The warning and the block also come by push [Owner, 2026-11-25].
    if (result.outcome === 'warn') {
      const count = String(result.skipsInRow);
      this.notices.tell([driverId], (locale) => notice('skip_warning', locale, { count }), { path: '/driver', keep: true });
    }
    if (result.outcome === 'block' && result.blockedUntil) {
      const time = new Date(result.blockedUntil).toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' });
      this.notices.tell([driverId], (locale) => notice('skip_block', locale, { time }), { path: '/driver', keep: true });
    }
    return result;
  }

  // His orders.

  /** الطلبات الحالية: his orders not yet delivered, oldest first. */
  async current(driverId: number): Promise<DriverOrder[]> {
    const rows = await this.db
      .select({ order: orders, store: { name: stores.name }, area: customerZones.name })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .leftJoin(addresses, eq(addresses.id, orders.addressId))
      .leftJoin(customerZones, eq(customerZones.id, addresses.zoneId))
      .where(and(eq(orders.driverId, driverId), inArray(orders.status, CURRENT_STATUSES)))
      .orderBy(asc(orders.id));
    return rows.map(({ order, store, area }) => toDriverOrder(order, store, area));
  }

  /** "تفاصيل الطلب": only his own orders, which is when he may see the customer's phone (§14). */
  async details(driverId: number, orderId: number): Promise<DriverOrderDetails> {
    const [row] = await this.db
      .select({
        order: orders,
        store: { name: stores.name, lat: stores.lat, lng: stores.lng },
        storeArea: storeZones.name,
        area: customerZones.name,
        customer: { firstName: users.firstName, lastName: users.lastName, phone: users.phone },
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .innerJoin(users, eq(users.id, orders.customerId))
      .leftJoin(storeZones, eq(storeZones.id, stores.zoneId))
      .leftJoin(addresses, eq(addresses.id, orders.addressId))
      .leftJoin(customerZones, eq(customerZones.id, addresses.zoneId))
      .where(and(eq(orders.id, orderId), eq(orders.driverId, driverId)));
    if (!row) throw orderNotFound();
    const { order, store, storeArea, area, customer } = row;
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.orderId, orderId)).orderBy(asc(orderLines.id));
    return {
      ...toDriverOrder(order, store, area),
      mode: order.mode,
      scheduledFor: iso(order.scheduledFor),
      note: order.note,
      store: { name: store.name, area: storeArea, location: locationOf(store) },
      customer: {
        name: nameOf(customer),
        phone: order.phone ?? customer.phone,
        address: order.addressText,
        location: order.lat !== null && order.lng !== null ? { lat: order.lat, lng: order.lng } : null,
      },
      lines: lines.map((l) => ({
        name: l.name,
        options: l.options,
        removedIngredients: l.removedIngredients,
        image: l.image,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
      count: lines.reduce((n, l) => n + l.quantity, 0),
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee,
      storeFromDriver: order.storeFromDriver,
      walletPaid: order.walletPaid,
      pointsPaid: order.pointsPaid,
    };
  }

  /** وصلت للمتجر, خارج للتوصيل, تم التوصيل on his own order; the row is locked so a double tap moves it once. */
  async step(driverId: number, orderId: number, action: DriverAction): Promise<DriverOrderDetails> {
    const { row, status, moved } = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.driverId, driverId)))
        .for('update');
      if (!row) throw orderNotFound();
      const change = driverStep({ status: row.status, atStore: row.atStoreAt !== null }, action);
      if (!change) throw conflict('ORDER_STATUS', `The order is ${row.status}; "${action}" cannot happen now`);
      await tx
        .update(orders)
        .set({ ...(change.status ? { status: change.status } : {}), ...(change.atStore ? { atStoreAt: new Date() } : {}) })
        .where(eq(orders.id, orderId));
      if (change.status) await tx.insert(orderEvents).values({ orderId, status: change.status, byUserId: driverId });
      // Points come once the order is delivered (§8.16), and his speed points with them (§10).
      if (change.status === 'delivered') {
        await this.orders.delivered(tx, row);
        await this.speedPointsFor(tx, row);
      }
      return { row, status: change.status ?? row.status, moved: change.status !== undefined };
    });
    this.live.orderChanged(row, { id: orderId, status });
    if (moved) {
      const code = codeOf(orderId);
      this.notices.tell([row.customerId], (locale) => customerStatusNotice(status, row.mode, code, locale), { path: `/order/${orderId}`, keep: true });
    }
    return this.details(driverId, orderId);
  }

  // The admin's side.

  async list(meId: number, q?: string): Promise<DriverAccount[]> {
    const where: (SQL | undefined)[] = [eq(users.role, 'driver'), isNull(users.deletedAt)];
    const query = q?.trim();
    if (query) {
      const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push(or(like(sql`concat(${users.firstName}, ' ', ${users.lastName})`, pattern), like(users.phone, pattern)));
    }
    const rows = await this.db.select({ user: users, driver: drivers }).from(users).leftJoin(drivers, eq(drivers.userId, users.id)).where(and(...where)).orderBy(asc(users.id));
    const working = await this.workingIds(rows.map((r) => r.user.id));
    return rows.map((r) => toDriverAccount(r.user, r.driver, working.has(r.user.id), meId));
  }

  async create(meId: number, body: CreateAdminDto): Promise<CreatedAccount> {
    if (await this.users.phoneInUse(body.phone)) throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    const password = generatePassword();
    const id = await this.users.create({
      role: 'driver',
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      passwordHash: await hashPassword(password),
    });
    await this.db.insert(drivers).values({ userId: id });
    return { account: await this.account(meId, id), password };
  }

  async resetPassword(id: number): Promise<GeneratedPassword> {
    await this.account(0, id);
    const password = generatePassword();
    await this.users.endSessions(id, { passwordHash: await hashPassword(password) });
    await this.sessions.revokeAllForUser(id);
    return { password };
  }

  /** A disabled delivery man is signed out at once and his shift ends. */
  async setDisabled(meId: number, id: number, disabled: boolean): Promise<DriverAccount> {
    await this.account(meId, id);
    if (disabled) {
      await this.users.endSessions(id, { disabledAt: new Date() });
      await this.sessions.revokeAllForUser(id);
      await this.db
        .update(shifts)
        .set({ endedAt: new Date() })
        .where(and(eq(shifts.driverId, id), isNull(shifts.endedAt), gt(shifts.endsAt, new Date())));
    } else {
      await this.users.update(id, { disabledAt: null });
    }
    return this.account(meId, id);
  }

  /** His own week, or null to follow the global one. */
  async setSchedule(meId: number, id: number, schedule: WeekSchedule | null): Promise<DriverAccount> {
    await this.account(meId, id);
    await this.driverRow(this.db, id);
    await this.db.update(drivers).set({ schedule }).where(eq(drivers.userId, id));
    return this.account(meId, id);
  }

  /** His own delivery fee rule for his earnings (§8.7), or null to earn the customer's fee. Orders he already took keep theirs. */
  async setFee(meId: number, id: number, fee: DeliveryFeeRule | null): Promise<DriverAccount> {
    await this.account(meId, id);
    await this.driverRow(this.db, id);
    await this.db
      .update(drivers)
      .set({ baseFee: fee?.baseFee ?? null, baseKm: fee?.baseKm ?? null, perKm: fee?.perKm ?? null })
      .where(eq(drivers.userId, id));
    return this.account(meId, id);
  }

  /** The admin starts his shift after his own window closed. */
  async startFor(meId: number, id: number): Promise<DriverAccount> {
    const account = await this.account(meId, id);
    if (account.disabled) throw driverNotFound();
    await this.start(id, meId);
    return this.account(meId, id);
  }

  /**
   * The admin gives an order to a delivery man (the 🛵 in الطلبات): an accepted delivery the app's
   * captains bring, before it leaves the store. It may replace the one who had it.
   */
  async assign(orderId: number, driverId: number): Promise<void> {
    const driver = await this.users.findLiveById(driverId);
    if (!driver || driver.role !== 'driver' || driver.disabledAt) throw driverNotFound();
    const before = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ order: orders, deliveredBy: stores.deliveredBy })
        .from(orders)
        .innerJoin(stores, eq(stores.id, orders.storeId))
        .where(eq(orders.id, orderId))
        .for('update');
      if (!row) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No order has this id');
      const { order, deliveredBy } = row;
      if (!OFFER_STATUSES.includes(order.status) || order.mode !== 'delivery' || deliveredBy !== 'platform') {
        throw conflict('ORDER_STATUS', `The order is ${order.status}; it cannot be given to a delivery man now`);
      }
      if (order.driverId === driverId) return order;
      const him = await this.driverRow(tx, driverId);
      await tx
        .update(orders)
        .set({ driverId, atStoreAt: null, takenAt: new Date(), driverFee: driverEarning(order, feeRuleOf(him)) })
        .where(eq(orders.id, orderId));
      return order;
    });
    this.live.toDrivers(DRIVER_SOCKET_EVENTS.offerGone, { id: orderId });
    this.live.toDriver(driverId, DRIVER_SOCKET_EVENTS.order, { id: orderId });
    if (before.driverId !== null && before.driverId !== driverId) this.live.toDriver(before.driverId, DRIVER_SOCKET_EVENTS.order, { id: orderId });
    this.live.orderChanged(before, { id: orderId });
  }

  settingsOf(): Promise<DriverSettings> {
    return this.settings.get();
  }

  updateSettings(change: Partial<DriverSettings>): Promise<DriverSettings> {
    return this.settings.update(change);
  }

  // Helpers.

  private async account(meId: number, id: number): Promise<DriverAccount> {
    const [row] = await this.db
      .select({ user: users, driver: drivers })
      .from(users)
      .leftJoin(drivers, eq(drivers.userId, users.id))
      .where(and(eq(users.id, id), eq(users.role, 'driver'), isNull(users.deletedAt)));
    if (!row) throw driverNotFound();
    const working = await this.workingIds([id]);
    return toDriverAccount(row.user, row.driver, working.has(id), meId);
  }

  /** Who of these is on a shift now. */
  private async workingIds(ids: number[]): Promise<Set<number>> {
    if (!ids.length) return new Set();
    const rows = await this.db
      .select({ driverId: shifts.driverId })
      .from(shifts)
      .where(and(inArray(shifts.driverId, ids), isNull(shifts.endedAt), gt(shifts.endsAt, new Date())));
    return new Set(rows.map((r) => r.driverId));
  }

  /** His row, made on first use (drivers made before Phase 13 have none). `lock` holds it for the transaction. */
  private async driverRow(tx: Db | Tx, driverId: number, lock = false): Promise<DriverRow> {
    const find = () => {
      const q = tx.select().from(drivers).where(eq(drivers.userId, driverId));
      return lock ? q.for('update') : q;
    };
    const [row] = await find();
    if (row) return row;
    await tx.insert(drivers).values({ userId: driverId }).onDuplicateKeyUpdate({ set: { userId: driverId } });
    const [made] = await find();
    return made!;
  }

  private async activeShift(tx: Db | Tx, driverId: number, now: Date): Promise<ShiftRow | undefined> {
    const [row] = await tx
      .select()
      .from(shifts)
      .where(and(eq(shifts.driverId, driverId), isNull(shifts.endedAt), gt(shifts.endsAt, now)))
      .orderBy(desc(shifts.id))
      .limit(1);
    return row;
  }

  /** His shift running now or the next one, from his own week or the global one; a shift he already worked gives the one after. */
  private async nextShift(tx: Db | Tx, me: DriverRow, rules: DriverSettings, now: Date): Promise<ShiftTime | null> {
    const week = me.schedule ?? rules.schedule;
    const shift = shiftAt(week, now);
    if (!shift) return null;
    const [worked] = await tx
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.driverId, me.userId), eq(shifts.startsAt, shift.startsAt)))
      .limit(1);
    return worked ? shiftAt(week, shift.endsAt) : shift;
  }

  /** From taking it to delivering it, per km: the admin's levels give his speed points (§10). */
  private async speedPointsFor(tx: Tx, row: OrderRow): Promise<void> {
    if (!row.takenAt) return;
    const speed = minutesPerKm((Date.now() - row.takenAt.getTime()) / 60_000, row.distanceKm);
    const { speedLevels } = await this.settings.get(tx);
    await tx.update(orders).set({ minutesPerKm: speed, driverPoints: speedPoints(speed, speedLevels) }).where(eq(orders.id, row.id));
  }

  /** The order locked, when it is still an offer. */
  private async lockOffer(tx: Tx, orderId: number): Promise<OrderRow> {
    const [row] = await tx
      .select({ order: orders, deliveredBy: stores.deliveredBy })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.id, orderId))
      .for('update');
    if (!row || !isOffer(row.order, row.deliveredBy)) throw conflict('OFFER_TAKEN', 'This offer is no longer open');
    return row.order;
  }

  private async counts(tx: Db | Tx, ids: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (!ids.length) return counts;
    const lines = await tx.select({ orderId: orderLines.orderId, quantity: orderLines.quantity }).from(orderLines).where(inArray(orderLines.orderId, ids));
    for (const { orderId, quantity } of lines) counts.set(orderId, (counts.get(orderId) ?? 0) + quantity);
    return counts;
  }
}

function toDriverOrder(order: OrderRow, store: { name: string }, area: string | null): DriverOrder {
  return {
    id: order.id,
    code: codeOf(order.id),
    status: order.status,
    atStore: order.atStoreAt !== null,
    store: { name: store.name },
    area,
    // تحصيل النقود: what the wallet did not pay.
    total: cashDue(order),
    createdAt: order.createdAt.toISOString(),
  };
}

function toDriverAccount(user: UserRow, driver: DriverRow | null, onShift: boolean, meId: number): DriverAccount {
  const now = new Date();
  return {
    ...toStaffAccount(user, meId),
    onShift,
    blockedUntil: driver?.blockedUntil && driver.blockedUntil > now ? driver.blockedUntil.toISOString() : null,
    schedule: driver?.schedule ?? null,
    fee: driver ? feeRuleOf(driver) : null,
  };
}

/** His own fee rule, when the admin set all three. */
function feeRuleOf(driver: DriverRow): DeliveryFeeRule | null {
  const { baseFee, baseKm, perKm } = driver;
  return baseFee !== null && baseKm !== null && perKm !== null ? { baseFee, baseKm, perKm } : null;
}

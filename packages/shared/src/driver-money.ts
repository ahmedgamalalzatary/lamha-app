// The delivery man's money (contract §10, §8.7): his earning per order, speed points, fines and
// سجل الطلبات. Owner's answers (2026-11-26): فواتيري is his net earnings; the admin adds fines;
// speed points stay a balance until the admin pays them out in cash.
import { fromCairo } from './driver.js';
import type { OrderStatus } from './enums.js';
import { type DeliveryFeeRule, deliveryFeeFor } from './order.js';

const cents = (n: number) => Math.round(n * 100) / 100;
const hasCents = (n: number) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

// Speed points [Owner, 2026-11-25].

/** A level: delivering at this many minutes per km or faster earns these points. */
export interface SpeedLevel {
  maxMinutesPerKm: number;
  points: number;
}

export const SPEED_LEVELS_MAX = 10;
export const SPEED_MINUTES_MAX = 600;
export const SPEED_POINTS_MAX = 10_000;

/** The most `orders.minutes_per_km` (DECIMAL(7,2)) holds. */
export const MINUTES_PER_KM_MAX = 99_999.99;

/**
 * From taking the order to delivering it, per km of the store-to-customer line; null without a
 * distance. Capped at what the orders table holds: a late, very short trip earns no points anyway,
 * and a bigger number would fail the save and with it the delivery.
 */
export function minutesPerKm(minutes: number, km: number | null): number | null {
  if (km === null || km <= 0) return null;
  return Math.min(cents(minutes / km), MINUTES_PER_KM_MAX);
}

/** The points of the fastest level reached; 0 slower than all of them. */
export function speedPoints(speed: number | null, levels: readonly SpeedLevel[]): number {
  if (speed === null) return 0;
  const reached = [...levels].sort((a, b) => a.maxMinutesPerKm - b.maxMinutesPerKm).find((l) => speed <= l.maxMinutesPerKm);
  return reached?.points ?? 0;
}

export function isSpeedLevels(v: unknown): v is SpeedLevel[] {
  if (!Array.isArray(v) || v.length > SPEED_LEVELS_MAX) return false;
  const ok = v.every(
    (l: unknown) =>
      typeof l === 'object' &&
      l !== null &&
      typeof (l as SpeedLevel).maxMinutesPerKm === 'number' &&
      hasCents((l as SpeedLevel).maxMinutesPerKm) &&
      (l as SpeedLevel).maxMinutesPerKm > 0 &&
      (l as SpeedLevel).maxMinutesPerKm <= SPEED_MINUTES_MAX &&
      Number.isInteger((l as SpeedLevel).points) &&
      (l as SpeedLevel).points >= 1 &&
      (l as SpeedLevel).points <= SPEED_POINTS_MAX,
  );
  return ok && new Set(v.map((l: SpeedLevel) => l.maxMinutesPerKm)).size === v.length;
}

// His earning on an order (§8.7).

/**
 * Fixed when he takes the order: his own rule on the order's distance, or the fee the customer was
 * asked for before a free delivery took it off.
 */
export function driverEarning(order: { distanceKm: number | null; deliveryFee: number; deliveryDiscount: number }, own: DeliveryFeeRule | null): number {
  if (own && order.distanceKm !== null) return deliveryFeeFor(order.distanceKm, own);
  return cents(order.deliveryFee + order.deliveryDiscount);
}

/** The same limits as the delivery settings. */
export const FEE_LIMITS = { baseFee: 10_000, baseKm: 1000, perKm: 10_000 } as const;

export function isFeeRuleOrNull(v: unknown): v is DeliveryFeeRule | null {
  if (v === null) return true;
  if (typeof v !== 'object') return false;
  return (Object.keys(FEE_LIMITS) as (keyof DeliveryFeeRule)[]).every((k) => {
    const n = (v as Record<string, unknown>)[k];
    return typeof n === 'number' && hasCents(n) && n >= 0 && n <= FEE_LIMITS[k];
  });
}

/** فواتيري: delivery earnings and speed points cash, less fines. */
export const netEarnings = (m: { earnings: number; pointsCash: number; fines: number }) => cents(m.earnings + m.pointsCash - m.fines);

// سجل الطلبات's date range.

/** "2026-11-22", a real date. */
export function isDayString(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** From the first day's midnight in Cairo to the midnight after the last day; the earlier day first. */
export function cairoDayRange(a: string, b: string): { from: Date; to: Date } {
  const [first, last] = a <= b ? [a, b] : [b, a];
  const at = (s: string, extraDays: number) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return fromCairo(y, m, d, extraDays * 1440);
  };
  return { from: at(first, 0), to: at(last, 1) };
}

// Fines (الخصومات والغرامات).

export const FINE_REASON_LIMIT = 200;
export const FINE_AMOUNT_MAX = 10_000;

export interface FineInput {
  amount: number;
  reason: string;
  /** The order it is about, when there is one. */
  orderId?: number;
}

export function fineProblem(input: Pick<FineInput, 'amount' | 'reason'>): 'amount' | 'reason' | null {
  if (!(input.amount > 0) || input.amount > FINE_AMOUNT_MAX || !hasCents(input.amount)) return 'amount';
  const reason = input.reason.trim();
  if (!reason || reason.length > FINE_REASON_LIMIT) return 'reason';
  return null;
}

// API shapes.

/** A card of "طلباتى" (driver/driver-order-history-date-range-earnings-complaint.jpg). */
export interface DriverHistoryOrder {
  id: number;
  code: string;
  status: OrderStatus;
  store: { name: string };
  /** "الاجمالى": how many items. */
  count: number;
  /** "+ 25.0 ج.م" on a delivered order; null otherwise. */
  earning: number | null;
  createdAt: string;
}

/** GET /v1/driver/history?from=&to=: the cards and the grey panel. */
export interface DriverHistory {
  orders: DriverHistoryOrder[];
  /** اجمالى الارباح. */
  earnings: number;
  /** عدد الطلبات المكتملة. */
  delivered: number;
}

export interface DriverFine {
  id: number;
  amount: number;
  reason: string;
  order: { id: number; code: string } | null;
  createdAt: string;
}

/** فواتيري: the net and what makes it. */
export interface DriverMoney {
  net: number;
  /** His delivered orders' earnings, all time. */
  earnings: number;
  /** Speed points paid out, plus the balance at today's point value. */
  pointsCash: number;
  fines: number;
  list: DriverFine[];
}

/** A line of his نقاطي: points from an order, or a payout. */
export interface DriverPointsEntry {
  kind: 'order' | 'payout';
  points: number;
  /** A payout's cash. */
  value: number | null;
  order: { id: number; code: string } | null;
  minutesPerKm: number | null;
  createdAt: string;
}

/** نقاطي of the delivery man. */
export interface DriverPoints {
  /** Not yet paid out. */
  balance: number;
  /** The balance in ج.م at today's point value. */
  value: number;
  pointValue: number;
  levels: SpeedLevel[];
  entries: DriverPointsEntry[];
}

/** The admin's view of his money (المندوبين › الحساب). */
export interface AdminDriverMoney extends DriverMoney {
  points: { balance: number; value: number };
}

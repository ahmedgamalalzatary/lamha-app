// The delivery man's shifts, offers and steps (contract §10, §15.1 #5).
import type { StaffAccount } from './auth.js';
import { isTimeOfDay, minuteOfDay } from './catalog.js';
import type { CartMode } from './cart.js';
import type { OrderStatus } from './enums.js';
import type { OrderLine } from './order.js';

/** One day's shift in Cairo time. An end at or before the start runs past midnight; the same time is a whole day. */
export interface ShiftRange {
  start: string;
  end: string;
}

/** The week from Sunday (0) to Saturday (6); null is a day without a shift. */
export type WeekSchedule = (ShiftRange | null)[];

export const WEEK_DAYS = 7;

/** "الأحد" … "السبت", in the schedule's order. */
export const WEEK_DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

const isRange = (d: unknown): d is ShiftRange =>
  typeof d === 'object' && d !== null && isTimeOfDay((d as ShiftRange).start) && isTimeOfDay((d as ShiftRange).end);

/**
 * Seven days of ranges or null. A shift past midnight (or of the same start and end, 24 hours) may
 * not run into the next day's shift (Saturday into Sunday too), or starting the later one would be
 * locked behind the earlier.
 */
export function isWeekSchedule(v: unknown): v is WeekSchedule {
  if (!Array.isArray(v) || v.length !== WEEK_DAYS || !v.every((d) => d === null || isRange(d))) return false;
  const week = v as WeekSchedule;
  return week.every((day, i) => {
    const next = week[(i + 1) % WEEK_DAYS];
    if (!day || !next) return true;
    const start = minuteOfDay(day.start);
    const end = minuteOfDay(day.end);
    // Past midnight, or the same time (24 hours, as shiftOn counts it): ends `end` minutes into the
    // next day, which may start only from then.
    return !(end <= start && minuteOfDay(next.start) < end);
  });
}

/** The admin's numbers (§15.1 #5). */
export interface DriverRules {
  /** "ابدأ الشفت" unlocks this long before the shift starts… */
  startEarlyMinutes: number;
  /** …and locks this long after it started; later only the admin starts it for him. */
  startLateMinutes: number;
  /** Each "تمديد" adds this much… */
  extendMinutes: number;
  /** …at most this many times a shift. */
  extendMax: number;
  /** An offer counts down this long, then shows again to everyone (no skip counted) [Owner, 2026-11-25]. */
  offerSeconds: number;
  /** Skips in a row that bring a warning… */
  skipWarn: number;
  /** …and a block of blockMinutes. A block or an accepted order starts the count again. */
  skipBlock: number;
  blockMinutes: number;
}

export const DEFAULT_DRIVER_RULES: DriverRules = {
  startEarlyMinutes: 30,
  startLateMinutes: 15,
  extendMinutes: 60,
  extendMax: 3,
  offerSeconds: 60,
  skipWarn: 2,
  skipBlock: 3,
  blockMinutes: 15,
};

/** الإعدادات of the drivers: the global week and the rules (GET and PATCH /v1/admin/settings/drivers). */
export interface DriverSettings extends DriverRules {
  schedule: WeekSchedule;
}

// Cairo wall time. Egypt has summer time, so the offset is asked of the time zone database each time.

const CAIRO_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

interface CairoDay {
  year: number;
  month: number;
  day: number;
}

function cairoParts(at: Date): CairoDay & { minute: number } {
  const parts = Object.fromEntries(CAIRO_PARTS.formatToParts(at).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Minutes Cairo is ahead of UTC at this instant. */
function cairoOffset(at: Date): number {
  const p = cairoParts(at);
  const wall = Date.UTC(p.year, p.month - 1, p.day) + p.minute * 60_000;
  return Math.round((wall - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** The instant of a Cairo wall time: month 1–12, minute after that day's midnight (may pass 1440). */
export function fromCairo(year: number, month: number, day: number, minute: number): Date {
  const wall = Date.UTC(year, month - 1, day) + minute * 60_000;
  const first = wall - cairoOffset(new Date(wall)) * 60_000;
  return new Date(wall - cairoOffset(new Date(first)) * 60_000);
}

export interface ShiftTime {
  startsAt: Date;
  endsAt: Date;
}

/** The shift a day of the week holds, placed on that Cairo date. */
function shiftOn(week: WeekSchedule, day: CairoDay): ShiftTime | null {
  const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay();
  const range = week[weekday];
  if (!range) return null;
  const start = minuteOfDay(range.start);
  let end = minuteOfDay(range.end);
  if (end <= start) end += 1440;
  return { startsAt: fromCairo(day.year, day.month, day.day, start), endsAt: fromCairo(day.year, day.month, day.day, end) };
}

/** The shift running now (it may have started yesterday), else the next one to start; null for an empty week. */
export function shiftAt(week: WeekSchedule, now: Date): ShiftTime | null {
  const today = cairoParts(now);
  for (let offset = -1; offset <= WEEK_DAYS; offset++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const shift = shiftOn(week, { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
    if (shift && shift.endsAt > now) return shift;
  }
  return null;
}

/** When "بدء نوبة العمل" is open: from startEarlyMinutes before the start to startLateMinutes after it. */
export function startWindow(shift: ShiftTime, rules: DriverRules): { from: Date; to: Date } {
  return {
    from: new Date(shift.startsAt.getTime() - rules.startEarlyMinutes * 60_000),
    to: new Date(shift.startsAt.getTime() + rules.startLateMinutes * 60_000),
  };
}

export function canStartShift(shift: ShiftTime, now: Date, rules: DriverRules): boolean {
  const { from, to } = startWindow(shift, rules);
  return now >= from && now <= to;
}

/** What a skip brings, from the skips in a row it makes. */
export function skipOutcome(skipsInRow: number, rules: DriverRules): 'warn' | 'block' | null {
  if (skipsInRow >= rules.skipBlock) return 'block';
  if (skipsInRow >= rules.skipWarn) return 'warn';
  return null;
}

/** The delivery man's steps after he accepts: وصلت للمتجر, خارج للتوصيل, تم التوصيل. */
export const DRIVER_ACTIONS = ['arrived', 'out', 'delivered'] as const;
export type DriverAction = (typeof DRIVER_ACTIONS)[number];

/**
 * What a step changes, or null when it may not happen now. He can reach the store while it
 * prepares; he leaves only once the store marked it ready (تم التجهيز).
 */
export function driverStep(order: { status: OrderStatus; atStore: boolean }, action: DriverAction): { status?: OrderStatus; atStore?: true } | null {
  const { status, atStore } = order;
  if (action === 'arrived') return !atStore && (status === 'preparing' || status === 'ready') ? { atStore: true } : null;
  if (action === 'out') return atStore && status === 'ready' ? { status: 'out_for_delivery' } : null;
  return status === 'out_for_delivery' ? { status: 'delivered' } : null;
}

// API shapes.

/** الرئيسية: where the delivery man stands now. */
export interface DriverShiftState {
  /** off: no shift running for him; on: working; the shift may be over while he still holds orders. */
  status: 'off' | 'on';
  /** His shift running now or the next one, from his own week or the global one. */
  shift: { startsAt: string; endsAt: string } | null;
  /** When "بدء نوبة العمل" opens and closes for that shift. */
  startFrom: string | null;
  startTo: string | null;
  canStart: boolean;
  /** While on: the end with the extensions, and how many "تمديد" are left. */
  endsAt: string | null;
  extensionsLeft: number;
  extendMinutes: number;
  /** A block for skipping, until this time. */
  blockedUntil: string | null;
  skipsInRow: number;
  offerSeconds: number;
  /** نوبات عملي: the week he follows (his own, or the global one). */
  week: WeekSchedule;
}

/** An offer: what he needs to decide (no customer phone before he accepts, §14). */
export interface DriverOffer {
  id: number;
  code: string;
  store: { name: string; area: string | null };
  /** The customer's area, from the address. */
  area: string | null;
  count: number;
  itemsTotal: number;
  /** ادفع نقداً للبائع. */
  storeFromDriver: number;
  /** تحصيل النقود. */
  total: number;
  deliveryFee: number;
  distanceKm: number | null;
  /** When the store accepted it: the countdown restarts every offerSeconds from here. */
  offeredAt: string;
}

/** What a skip brought. */
export interface SkipResult {
  outcome: 'warn' | 'block' | null;
  skipsInRow: number;
  blockedUntil: string | null;
}

/** A card in الطلبات الحالية. */
export interface DriverOrder {
  id: number;
  code: string;
  status: OrderStatus;
  atStore: boolean;
  store: { name: string };
  area: string | null;
  total: number;
  createdAt: string;
}

/** "تفاصيل الطلب #485804" (driver/driver-order-details-pay-store-collect-cash-out-for-delivery.jpg). */
export interface DriverOrderDetails extends DriverOrder {
  mode: CartMode;
  scheduledFor: string | null;
  note: string;
  store: { name: string; area: string | null; location: { lat: number; lng: number } | null };
  customer: { name: string; phone: string; address: string | null; location: { lat: number; lng: number } | null };
  lines: OrderLine[];
  count: number;
  itemsTotal: number;
  deliveryFee: number;
  storeFromDriver: number;
}

/** المندوبين in the dashboard and the admin's app (§11, §11.2). */
export interface DriverAccount extends StaffAccount {
  /** Working now. */
  onShift: boolean;
  blockedUntil: string | null;
  /** His own week; null follows the global one. */
  schedule: WeekSchedule | null;
}

/** Socket events to delivery men (§12 S3). */
export const DRIVER_SOCKET_EVENTS = {
  /** A store accepted a delivery order: there is a new offer. */
  offer: 'offer.new',
  /** An offer was taken or withdrawn. */
  offerGone: 'offer.gone',
  /** One of his orders changed (the store marked it ready, the admin moved it): { id }. */
  order: 'driver.order',
} as const;

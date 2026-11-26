// نقاطي (contract §8.16): earning points per order, spending them at checkout, and the admin's rules.

import { WALLET_NOTE_LIMIT, type WalletKind } from './wallet.js';

const cents = (n: number) => Math.round(n * 100) / 100;
/** Tolerance for money held as floating point (0.1 + 0.2). */
const EPS = 1e-9;

/**
 * الإعدادات › النقاط (contract §11 A21), global [Owner, 2026-11-26: two settings, not one rate]. The
 * defaults are ours [Derived]: 10 ج.م earn a point, a point pays 0.10 ج.م, 100 points to spend.
 */
export interface PointsSettings {
  /** Every full this many ج.م earns one point. */
  earnEvery: number;
  /** What one point pays, in ج.م. */
  pointValue: number;
  /** الحد الأدنى للاستبدال: fewer points cannot be spent [Owner, 2026-11-25: default 100]. */
  minimum: number;
}

/** The points an amount earns: one for every full earnEvery ج.م. */
export function pointsEarned(base: number, earnEvery: number): number {
  if (!(earnEvery > 0) || !(base > 0)) return 0;
  return Math.floor(base / earnEvery + EPS);
}

/**
 * What earns on an order: the items only, never the delivery fee; the wallet counts as cash and
 * what points paid earns nothing [Owner]. Points are taken as paying the items first [Derived].
 */
export function earnBase(itemsTotal: number, pointsPaid: number): number {
  return cents(Math.max(0, itemsTotal - pointsPaid));
}

/**
 * The points "نقاطي" spends on what is still due after the wallet [Owner, 2026-11-26: wallet first]:
 * whole points, never more than is due, the delivery fee included; none below the minimum.
 */
export function pointsPay(balance: number, due: number, rules: PointsSettings): { points: number; value: number } {
  if (balance < rules.minimum || !(rules.pointValue > 0) || !(due > 0)) return { points: 0, value: 0 };
  const points = Math.min(Math.floor(balance), Math.floor(due / rules.pointValue + EPS));
  return { points, value: pointsWorth(points, rules.pointValue) };
}

/** قيمة نقاطك. */
export const pointsWorth = (points: number, pointValue: number) => cents(points * pointValue);

/** "باقي <n> نقطة للاستبدال". */
export const pointsToGo = (balance: number, minimum: number) => Math.max(0, minimum - balance);

/** Why points move: an order earned or spent them, a rejected order's back, or the admin. */
export const POINTS_REASONS = ['order', 'refund', 'admin'] as const;
export type PointsReason = (typeof POINTS_REASONS)[number];

/** A row of المكتسبة ("add") or المنفقة ("deduct"). */
export interface PointsEntry {
  id: number;
  kind: WalletKind;
  reason: PointsReason;
  points: number;
  note: string;
  orderCode: string | null;
  createdAt: string;
}

/** GET /v1/me/points */
export interface MyPoints extends PointsSettings {
  balance: number;
  /** قيمة نقاطك: the balance in ج.م. */
  worth: number;
  entries: PointsEntry[];
}

export const POINTS_ADJUST_MAX = 100_000;

/** POST /v1/admin/customers/:id/points */
export interface PointsAdjustInput {
  kind: WalletKind;
  points: number;
  note: string;
}

/** Whole points above 0 and up to the cap, a reason, and never below 0 [Derived from the wallet's rule]. */
export function pointsAdjustProblem(input: PointsAdjustInput, balance: number): 'points' | 'note' | 'balance' | null {
  if (!Number.isInteger(input.points) || input.points <= 0 || input.points > POINTS_ADJUST_MAX) return 'points';
  const note = input.note.trim();
  if (!note || note.length > WALLET_NOTE_LIMIT) return 'note';
  if (input.kind === 'deduct' && input.points > balance) return 'balance';
  return null;
}

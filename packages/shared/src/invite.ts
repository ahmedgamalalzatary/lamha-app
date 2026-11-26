// ادعُ أصدقاءك (contract §8.17): the rewards, their limits and expiry, and how the wallet spends them.
import type { Vertical } from './enums.js';

const cents = (n: number) => Math.round(n * 100) / 100;
const DAY = 24 * 60 * 60_000;

/**
 * التسويق والعروض › مكافآت الدعوة (§11 A17). Tawsilty's rules as admin settings [Owner, 2026-11-26];
 * the monthly cap is in ج.م [Owner]; expiry is a switch [Owner].
 */
export interface InviteSettings {
  /** What the inviter earns once the friend's first order is delivered. */
  reward: number;
  /** The most of the reward one order may use. */
  rewardPerOrder: number;
  /** Days the reward stays usable. */
  rewardDays: number;
  /** What the friend gets on signing up. */
  friendReward: number;
  /** Days the friend's money stays usable. */
  friendDays: number;
  /** The friend's first order must be delivered within this many days of signing up. */
  firstOrderDays: number;
  /** The most one customer earns from invites in a calendar month, ج.م. */
  monthlyCap: number;
  /** Off: invite money never expires. */
  expires: boolean;
}

export const INVITE_DEFAULTS: InviteSettings = {
  reward: 300,
  rewardPerOrder: 30,
  rewardDays: 30,
  friendReward: 25,
  friendDays: 30,
  firstOrderDays: 30,
  monthlyCap: 1000,
  expires: true,
};

/** Invite money pays only restaurant and market orders, never pharmacy or send-anything [Tawsilty]. */
export const INVITE_VERTICALS: readonly Vertical[] = ['restaurant', 'market'];

/** A piece of invite money still in the wallet. */
export interface InviteCredit {
  id: number;
  left: number;
  /** The most one order may use of it (the inviter's reward); null for none. */
  perOrder: number | null;
  expiresAt: string | null;
}

export interface WalletPlan {
  paid: number;
  /** From the regular balance. */
  regular: number;
  /** From each piece of invite money. */
  credits: { id: number; amount: number }[];
}

/**
 * What "رصيد المحفظة" pays of an order: invite money first, the soonest to expire first, each piece
 * within its per-order limit and only on restaurant and market orders [Derived: it expires, the regular
 * balance does not]; then the regular balance; never more than the total.
 */
export function walletPlan(regular: number, credits: InviteCredit[], vertical: Vertical, total: number): WalletPlan {
  let left = total;
  const used: { id: number; amount: number }[] = [];
  if (INVITE_VERTICALS.includes(vertical)) {
    const order = [...credits].sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'));
    for (const c of order) {
      if (left <= 0) break;
      const amount = cents(Math.min(c.left, c.perOrder ?? Number.POSITIVE_INFINITY, left));
      if (amount <= 0) continue;
      used.push({ id: c.id, amount });
      left = cents(left - amount);
    }
  }
  const fromRegular = cents(Math.max(0, Math.min(regular, left)));
  const paid = cents(used.reduce((n, c) => n + c.amount, 0) + fromRegular);
  return { paid, regular: fromRegular, credits: used };
}

/** The reward the month still allows [Owner: the cap is in ج.م]. */
export function inviteRewardFor(reward: number, earnedThisMonth: number, monthlyCap: number): number {
  return cents(Math.max(0, Math.min(reward, monthlyCap - earnedThisMonth)));
}

/** Whether the friend's first order came within the days after signing up. */
export function firstOrderInTime(signedUpAt: Date, deliveredAt: Date, days: number): boolean {
  return deliveredAt.getTime() - signedUpAt.getTime() <= days * DAY;
}

/** When invite money given at `at` stops working, or null with expiry switched off. */
export function inviteExpiry(at: Date, days: number, expires: boolean): Date | null {
  return expires ? new Date(at.getTime() + days * DAY) : null;
}

/** The field that is wrong, or null. */
export function inviteSettingsProblem(s: InviteSettings): keyof InviteSettings | null {
  const money = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100_000;
  const days = (n: number) => Number.isInteger(n) && n >= 1 && n <= 3650;
  if (!money(s.reward)) return 'reward';
  if (!money(s.rewardPerOrder) || s.rewardPerOrder > s.reward) return 'rewardPerOrder';
  if (!days(s.rewardDays)) return 'rewardDays';
  if (!money(s.friendReward)) return 'friendReward';
  if (!days(s.friendDays)) return 'friendDays';
  if (!days(s.firstOrderDays)) return 'firstOrderDays';
  if (!money(s.monthlyCap)) return 'monthlyCap';
  return null;
}

/** A friend who signed up with the code: waiting for a first order, rewarded, or too late. */
export type InviteStatus = 'waiting' | 'rewarded' | 'missed';

export interface InvitedFriend {
  /** First name only [Derived: the friend's privacy]. */
  name: string;
  joinedAt: string;
  status: InviteStatus;
  /** What the inviter got for them (0 while waiting, or when the month's cap was reached). */
  reward: number;
}

/** GET /v1/me/invite: ادعُ أصدقاءك. */
export interface InviteOverview {
  code: string;
  settings: InviteSettings;
  /** ربحت: every reward earned. */
  earned: number;
  /** رصيدك المتاح: invite money still usable. */
  available: number;
  /** "متبقٍ لك <n> مكافآت هذا الشهر". */
  leftThisMonth: number;
  friends: InvitedFriend[];
}

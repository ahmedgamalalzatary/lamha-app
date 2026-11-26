// The wallet (contract §8.15): its balance, additions and deductions, and paying an order with it.
// Top-up is excluded for now (§15.1 #2): money comes in from the admin and from returned orders.

const cents = (n: number) => Math.round(n * 100) / 100;

export const WALLET_KINDS = ['add', 'deduct'] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

/** Why money moved: the admin, an order paid with it, or a rejected or cancelled order's money back. */
export const WALLET_REASONS = ['admin', 'order', 'refund'] as const;
export type WalletReason = (typeof WALLET_REASONS)[number];

/** A row of الإضافات or الخصومات. */
export interface WalletEntry {
  id: number;
  kind: WalletKind;
  reason: WalletReason;
  amount: number;
  /** The admin's reason; empty for an order's. */
  note: string;
  /** "#506898" without the hash, for an order's money. */
  orderCode: string | null;
  createdAt: string;
}

/** GET /v1/me/wallet: حركة المحفظة, newest first. */
export interface Wallet {
  balance: number;
  entries: WalletEntry[];
}

/**
 * What "رصيد المحفظة" pays of an order: as much as the wallet holds, up to the total; cash on delivery
 * pays the rest [Owner, 2026-11-26].
 */
export function walletPays(balance: number, total: number): number {
  return cents(Math.max(0, Math.min(balance, total)));
}

/** The cash the customer still pays after the wallet and the points: what the delivery man (or the store) collects. */
export function cashDue(order: { total: number; walletPaid: number; pointsPaid?: number }): number {
  return cents(order.total - order.walletPaid - (order.pointsPaid ?? 0));
}

/** The most the admin adds or deducts at once [Derived: Tawsilty's top-up allows up to 10,000 ج.م]. */
export const WALLET_ADJUST_MAX = 10_000;
export const WALLET_NOTE_LIMIT = 200;

/** POST /v1/admin/customers/:id/wallet */
export interface WalletAdjustInput {
  kind: WalletKind;
  amount: number;
  /** The reason, which the customer also sees on the row [Derived]. */
  note: string;
}

/**
 * Why an adjustment cannot be made, or null: an amount above 0 and up to the cap, in whole piastres;
 * a reason; and never deducting more than the balance [Owner, 2026-11-26].
 */
export function adjustProblem(input: WalletAdjustInput, balance: number): 'amount' | 'note' | 'balance' | null {
  const { amount } = input;
  if (!Number.isFinite(amount) || amount <= 0 || amount > WALLET_ADJUST_MAX || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) return 'amount';
  const note = input.note.trim();
  if (!note || note.length > WALLET_NOTE_LIMIT) return 'note';
  if (input.kind === 'deduct' && amount > cents(balance)) return 'balance';
  return null;
}

/** العملاء in the dashboard (contract §11 A3, A5). */
export interface CustomerAccount {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  walletBalance: number;
  pointsBalance: number;
  createdAt: string;
}

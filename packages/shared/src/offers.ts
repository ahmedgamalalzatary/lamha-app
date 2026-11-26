// Offers, codes and banners (contract §8.2, §8.4, §8.7, §8.10; §11 التسويق والعروض).
import type { Product } from './catalog.js';
import type { Vertical } from './enums.js';
import type { SearchScope } from './store-list.js';

const cents = (n: number) => Math.round(n * 100) / 100;

/** Who loses a discount's money, set per offer [Owner, 2026-11-26]. */
export const PAID_BY = ['store', 'app'] as const;
export type PaidBy = (typeof PAID_BY)[number];

/** A code takes a fixed amount or a percentage with an optional cap [Owner, 2026-11-26]. */
export const COUPON_KINDS = ['amount', 'percent'] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

/**
 * One kind of code [Owner, 2026-11-26]: the store page's قسائم and the checkout's "وفر على طلبك"
 * are the same codes. One naming a store shows in its قسائمي sheet; one naming none works everywhere.
 */
export interface CouponTerms {
  kind: CouponKind;
  /** ج.م for an amount, 1–100 for a percentage. */
  value: number;
  /** A percentage's cap in ج.م; null for none. */
  maxDiscount: number | null;
}

/** What a code takes off the items; never more than they cost. */
export function couponDiscount(terms: CouponTerms, itemsTotal: number): number {
  const raw = terms.kind === 'amount' ? terms.value : cents((itemsTotal * terms.value) / 100);
  const capped = terms.maxDiscount === null ? raw : Math.min(raw, terms.maxDiscount);
  return cents(Math.min(capped, itemsTotal));
}

/** "Black Friday", " black  friday ": the same code. */
export const normalizeCode = (code: string) => code.trim().replace(/\s+/g, ' ').toLowerCase();

/** Limits on a code's text. */
export const COUPON = { codeMaxLength: 40, titleMaxLength: 80 } as const;

/** Why a code cannot be used on this order (the API's error codes). */
export const COUPON_PROBLEMS = ['COUPON_NOT_FOUND', 'COUPON_STORE', 'COUPON_MIN_ORDER', 'COUPON_USED', 'COUPON_GONE'] as const;
export type CouponProblem = (typeof COUPON_PROBLEMS)[number];

/** A code's rules, as stored. Times are ISO; null leaves that end open. */
export interface CouponRule extends CouponTerms {
  active: boolean;
  storeId: number | null;
  minOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  /** Uses per customer [Owner, 2026-11-26: the admin sets it]. */
  perCustomer: number;
  /** Uses by everyone; null for no limit. */
  totalLimit: number | null;
}

export interface CouponContext {
  now: Date;
  storeId: number;
  itemsTotal: number;
  /** This customer's uses on orders that still stand (a rejected order gives its use back). */
  usedByMe: number;
  usedByAll: number;
}

/** null when the code may be used on this order. An unknown, switched-off or out-of-dates code is not found. */
export function couponProblem(rule: CouponRule, at: CouponContext): CouponProblem | null {
  const t = at.now.getTime();
  if (!rule.active || (rule.startsAt && Date.parse(rule.startsAt) > t) || (rule.endsAt && Date.parse(rule.endsAt) < t)) return 'COUPON_NOT_FOUND';
  if (rule.storeId !== null && rule.storeId !== at.storeId) return 'COUPON_STORE';
  if (at.itemsTotal < rule.minOrder) return 'COUPON_MIN_ORDER';
  if (at.usedByMe >= rule.perCustomer) return 'COUPON_USED';
  if (rule.totalLimit !== null && at.usedByAll >= rule.totalLimit) return 'COUPON_GONE';
  return null;
}

/** A code as customers see it: the قسائمي sheet and the voucher badge "خصم 6 ج.م على 150 ج.م". */
export interface Voucher extends CouponTerms {
  id: number;
  code: string;
  /** "Black Friday" in red on the sheet. */
  title: string;
  storeId: number | null;
  minOrder: number;
  /** "صالح حتى 30 نوفمبر 2026"; null for no end. */
  endsAt: string | null;
}

/** التسويق والعروض › الكوبونات: what the admin sets on a code. */
export interface CouponInput extends Omit<CouponRule, 'startsAt' | 'endsAt'> {
  code: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  paidBy: PaidBy;
}

export interface AdminCoupon extends CouponInput {
  id: number;
  storeName: string | null;
  /** Uses on orders that still stand. */
  used: number;
  createdAt: string;
}

/** The field the admin's code form must fix first, or null. */
export function couponInputProblem(input: CouponInput): keyof CouponInput | null {
  if (!input.code.trim() || input.code.length > COUPON.codeMaxLength) return 'code';
  if (!input.title.trim() || input.title.length > COUPON.titleMaxLength) return 'title';
  if (!(input.value > 0) || (input.kind === 'percent' && input.value > 100)) return 'value';
  if (input.maxDiscount !== null && !(input.maxDiscount > 0)) return 'maxDiscount';
  if (!(input.minOrder >= 0)) return 'minOrder';
  if (!Number.isInteger(input.perCustomer) || input.perCustomer < 1) return 'perCustomer';
  if (input.totalLimit !== null && (!Number.isInteger(input.totalLimit) || input.totalLimit < 1)) return 'totalLimit';
  if (input.startsAt && input.endsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) return 'endsAt';
  return null;
}

/**
 * The fee waived by a store's free delivery: from `from` ج.م of items, 0 meaning every order;
 * null is no offer. [Derived] The items total after product discounts, before a code.
 */
export function deliveryDiscount(from: number | null, itemsTotal: number, fee: number): number {
  return from !== null && itemsTotal >= from ? fee : 0;
}

/** "وفر 5.0 ج.م": a product's old price less its price. */
export const productSaving = (p: { price: number; oldPrice: number | null }) => (p.oldPrice !== null && p.oldPrice > p.price ? cents(p.oldPrice - p.price) : 0);

/** A store's product discounts: "خصم 30 ج.م على منتجات", or "خصم حتى 60 ج.م" when they differ. */
export interface DiscountRange {
  upTo: number;
  same: boolean;
}

export function discountRange(savings: number[]): DiscountRange | null {
  const on = savings.filter((s) => s > 0);
  if (!on.length) return null;
  const upTo = Math.max(...on);
  return { upTo, same: on.every((s) => s === upTo) };
}

/** A store's offers on its rows, page and the offers screen (§8.3, §8.4, §8.10). */
export interface StoreOffers {
  /** The store's own code with the biggest saving: the "قسيمة" badge. */
  voucher: Voucher | null;
  /** "توصيل مجاني للطلبات من 300 ج.م"; 0 shows the fee struck through with "مجاني". */
  freeDeliveryFrom: number | null;
  discount: DiscountRange | null;
}

/** The offers screen's tabs: خصومات · كوبونات · عروض التوصيل. */
export const OFFER_KINDS = ['discounts', 'coupons', 'delivery'] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export function hasOffer(offers: StoreOffers, kind: OfferKind): boolean {
  if (kind === 'discounts') return offers.discount !== null;
  if (kind === 'coupons') return offers.voucher !== null;
  return offers.freeDeliveryFrom !== null;
}

/** GET /v1/catalog/offers */
export interface OffersQuery {
  kind: OfferKind;
  scope: SearchScope;
  addressId?: number;
}

export interface Discount {
  discount: number;
  paidBy: PaidBy;
}

/**
 * The items amount the store is paid on (before the app's share, §8.7): its full prices when the app
 * pays a discount, less what it pays itself. A store-paid free delivery costs it the waived fee.
 */
export function storeItemsBase(o: { itemsTotal: number; appProductSaving: number; coupon: Discount | null; delivery: Discount | null }): number {
  const byStore = (d: Discount | null) => (d?.paidBy === 'store' ? d.discount : 0);
  return cents(Math.max(0, o.itemsTotal + o.appProductSaving - byStore(o.coupon) - byStore(o.delivery)));
}

/**
 * A home banner (§8.2): the carousel's slides open their store; a "rail" banner sits over a row of
 * the store's products and opens its products grid (Tawsilty's mart banner).
 */
export const BANNER_PLACES = ['carousel', 'rail'] as const;
export type BannerPlace = (typeof BANNER_PLACES)[number];

/** A banner opens the store page, or the store's products as one grid (Tawsilty's "توصيلتي مارت"). */
export const BANNER_OPENS = ['store', 'products'] as const;
export type BannerOpens = (typeof BANNER_OPENS)[number];

export interface BannerInput {
  image: string;
  place: BannerPlace;
  storeId: number;
  opens: BannerOpens;
  sortOrder: number;
  active: boolean;
}

export interface AdminBanner extends BannerInput {
  id: number;
  storeName: string;
}

/** A banner on the home screen; a rail's banner comes with the store's first products. */
export interface HomeBanner {
  id: number;
  image: string;
  place: BannerPlace;
  opens: BannerOpens;
  store: { id: number; name: string; vertical: Vertical };
  products: Product[];
}

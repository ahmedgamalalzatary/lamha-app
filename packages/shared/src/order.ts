// Checkout, delivery fee and who pays whom (contract §8.7, §15.1 #3 and #11).
import type { LatLng } from './address.js';
import type { CartMode } from './cart.js';
import { type DeliveredBy, isOpenAt, minuteOfDay, type StoreHours } from './catalog.js';
import type { OrderStatus } from './enums.js';
import type { PointsSettings } from './points.js';

const cents = (n: number) => Math.round(n * 100) / 100;

/** The admin's delivery fee rule: a base fee for the first base km, then a fee per started km over it. */
export interface DeliveryFeeRule {
  baseFee: number;
  baseKm: number;
  perKm: number;
}

/** What the customer pays for a straight-line distance. 2.3 km over a 2 km base counts 1 km more. */
export function deliveryFeeFor(km: number, rule: DeliveryFeeRule): number {
  // To the metre first, so floating-point noise never starts a new kilometre.
  const over = Math.round(Math.max(0, km - rule.baseKm) * 1000) / 1000;
  return cents(rule.baseFee + Math.ceil(over) * rule.perKm);
}

/**
 * Who pays whom on a cash order (§8.7): 1 the delivery man pays the store the items total; 2 he keeps
 * the app's percentage of it and pays the store the rest; 3 he pays the store nothing and the app
 * settles with the store later.
 */
export const PAYOUT_OPTIONS = ['fee_only', 'app_share', 'nothing'] as const;
export type PayoutOption = (typeof PAYOUT_OPTIONS)[number];

export interface Payout {
  /** The app's percentage of the items total (none in option 1). */
  appShare: number;
  /** What the store is owed for the order. */
  storeGets: number;
  /** What the delivery man hands the store: "ادفع نقداً للبائع" / "استلم من المندوب". */
  storeFromDriver: number;
}

export function payout(itemsTotal: number, option: PayoutOption, appPercent: number): Payout {
  const appShare = option === 'fee_only' ? 0 : cents((itemsTotal * appPercent) / 100);
  const storeGets = cents(itemsTotal - appShare);
  return { appShare, storeGets, storeFromDriver: option === 'nothing' ? 0 : storeGets };
}

/** الإعدادات › رسوم التوصيل والدفع (GET and PATCH /v1/admin/settings/delivery). */
export interface DeliverySettings extends DeliveryFeeRule {
  /** Used by every store without its own option. */
  payoutOption: PayoutOption;
  appPercent: number;
}

/** "اختر وقتاً لاحقاً": slots are this far apart, and the first is at least this far ahead. */
export const SLOT_MINUTES = 30;

/**
 * Today's later-delivery slots (§8.7) as minutes after today's midnight in Cairo: every half hour,
 * at least 30 minutes from now, while the store is open. A store open past midnight keeps its slots
 * until it closes (values from 1440 on); one open all day stops at midnight.
 */
export function deliverySlots(now: number, hours: StoreHours): number[] {
  const open = minuteOfDay(hours.opensAt);
  const close = minuteOfDay(hours.closesAt);
  const end = open > close ? 1440 + close : 1440;
  const slots: number[] = [];
  for (let t = Math.ceil((now + SLOT_MINUTES) / SLOT_MINUTES) * SLOT_MINUTES; t < end; t += SLOT_MINUTES) {
    if (isOpenAt(hours, t % 1440)) slots.push(t);
  }
  return slots;
}

/** "8:30 PM", as Tawsilty's slot list reads (Latin digits in both languages, §7). */
export function slotLabel(minute: number): string {
  const m = minute % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** POST /v1/me/checkout/quote: the bill for the cart at an address (a delivery), or a pickup. */
export interface CheckoutQuoteInput {
  /** The store's cart being paid for: a customer has one per store (§8.6). */
  cartId: number;
  addressId?: number;
  /** The spot confirmed on the map, when it differs from the saved address's. */
  location?: LatLng;
  /** "وفر على طلبك" (§8.7): a code from the قسائمي sheet or anywhere else, as typed. */
  couponCode?: string;
}

export interface CheckoutQuote {
  cartId: number;
  mode: CartMode;
  count: number;
  itemsTotal: number;
  /** 0 for a pickup or a free delivery (§8.4). */
  deliveryFee: number;
  /** The fee before a free delivery: struck through beside "مجاني" when it differs. */
  usualDeliveryFee: number;
  /** The code taken off the items (§8.7 "وفر على طلبك"); null without one. */
  coupon: { code: string; title: string; discount: number } | null;
  /** Items plus the fee, less the code [Owner, 2026-11-26: the code first, then the wallet and points]. */
  total: number;
  /** Store to customer, straight line; null for a pickup. */
  distanceKm: number | null;
  /** Today's later-delivery slots (see deliverySlots). */
  slots: number[];
  /**
   * What رصيد المحفظة can pay on this order (§8.15): the regular balance and the invite money this
   * order may use (§8.17). "رصيدك" pays walletPays(walletBalance, total) when switched on.
   */
  walletBalance: number;
  /** نقاطي now (§8.16): pointsPay(pointsBalance, what the wallet left, points) when switched on. */
  pointsBalance: number;
  points: PointsSettings;
}

/** POST /v1/me/orders */
export interface PlaceOrderInput extends CheckoutQuoteInput {
  /** A slot from the quote, or null for "سيصل خلال 30 دقيقة". */
  slot: number | null;
  /** The total the customer saw; a different one on the server means the bill changed. */
  expectedTotal: number;
  /**
   * What the wallet pays, as the customer saw it: 0 or left out with "رصيد المحفظة" off. A different
   * amount on the server (the balance moved) means the bill changed.
   */
  expectedWalletPaid?: number;
  /** The points "نقاطي" spends, as the customer saw it; 0 or left out with it off. */
  expectedPointsSpent?: number;
  /** One per tap of "تنفيذ الطلب": the same key twice places one order. */
  requestId: string;
}

/** An order as the customer's طلباتي lists it. */
export interface CustomerOrder {
  id: number;
  /** "#506898" without the hash. */
  code: string;
  status: OrderStatus;
  store: { id: number; name: string; logo: string | null };
  mode: CartMode;
  /** ISO time of a later delivery, or null for now. */
  scheduledFor: string | null;
  count: number;
  itemsTotal: number;
  deliveryFee: number;
  /** A code's discount (§8.7) and the code; 0 and null without one. */
  couponDiscount: number;
  couponCode: string | null;
  total: number;
  /** Paid from the wallet (§8.15); the rest, cashDue, is paid in cash. */
  walletPaid: number;
  /** Of walletPaid, what invite money paid: "المدفوع من رصيد دعوة الأصدقاء" (§8.17). */
  invitePaid: number;
  /** Paid with points (§8.16): pointsSpent points worth pointsPaid ج.م. */
  pointsSpent: number;
  pointsPaid: number;
  createdAt: string;
}

export interface PlacedOrder {
  order: CustomerOrder;
}

/** A row of the dashboard's الطلبات table (contract §11). */
export interface AdminOrder extends CustomerOrder {
  customer: { id: number; name: string; phone: string };
  note: string;
  /** "بدون كابتن" until a delivery man takes it (§10). */
  hasDriver: boolean;
  /** الكابتن: who took it, or whom the admin assigned. */
  driver: { id: number; name: string } | null;
  /** A store delivering with its own people never needs a captain. */
  deliveredBy: DeliveredBy;
  paymentMethod: 'cash';
  payoutOption: PayoutOption;
  appShare: number;
  storeFromDriver: number;
}

// The store's side of an order (contract §9, §11.1).

/**
 * What a store does to an order: قبول, رفض, تم التجهيز, تم الاستلام for a pickup the customer took,
 * and خارج للتوصيل and تم التوصيل when the store delivers with its own people.
 */
export const PARTNER_ACTIONS = ['accept', 'reject', 'ready', 'collected', 'out', 'delivered'] as const;
export type PartnerAction = (typeof PARTNER_ACTIONS)[number];

/**
 * The status an action moves the order to, or null when it may not happen now. A delivery leaves
 * "تم التجهيز" with the delivery man (§10); a pickup is closed by the store when the customer takes
 * it; a store delivering with its own people sends it out and closes it [Owner, 2026-11-25].
 */
export function nextStatus(status: OrderStatus, action: PartnerAction, mode: CartMode, deliveredBy: DeliveredBy = 'platform'): OrderStatus | null {
  if (status === 'pending_review') return action === 'accept' ? 'preparing' : action === 'reject' ? 'rejected' : null;
  if (status === 'preparing') return action === 'ready' ? 'ready' : null;
  if (mode === 'pickup') return status === 'ready' && action === 'collected' ? 'delivered' : null;
  if (deliveredBy !== 'store') return null;
  if (status === 'ready') return action === 'out' ? 'out_for_delivery' : null;
  if (status === 'out_for_delivery') return action === 'delivered' ? 'delivered' : null;
  return null;
}

/** An order card in the store's lists: الطلبات الجديده and طلباتى. */
export interface PartnerOrder {
  id: number;
  code: string;
  status: OrderStatus;
  mode: CartMode;
  scheduledFor: string | null;
  count: number;
  itemsTotal: number;
  /** "خصم الكوبون": taken off the total. */
  couponDiscount: number;
  total: number;
  /** Paid from the wallet: "المدفوع من المحفظة"; المجموع is what is left to collect (cashDue). */
  walletPaid: number;
  /** Of walletPaid, what invite money paid: "المدفوع من رصيد دعوة الأصدقاء". */
  invitePaid: number;
  /** Paid with points: "المدفوع بالنقاط". */
  pointsPaid: number;
  /** ملاحظات العميل, shown in red. */
  note: string;
  /** طريقة الدفع (§9): cash only for now (§15.1 #2). */
  paymentMethod: 'cash';
  createdAt: string;
}

/** A product line as it was ordered. */
export interface OrderLine {
  name: string;
  options: string[];
  removedIngredients: string[];
  image: string | null;
  unitPrice: number;
  quantity: number;
}

/** The store's order details screen (§9). */
export interface PartnerOrderDetails extends PartnerOrder {
  customer: { name: string; phone: string };
  /** التوصيل إلى; null for a pickup. */
  addressText: string | null;
  deliveryFee: number;
  lines: OrderLine[];
  payoutOption: PayoutOption;
  /** "استلم من المندوب": what the delivery man pays the store in cash. */
  storeFromDriver: number;
  /** معلومات المندوب, once one takes the order (§10). */
  driver: { name: string } | null;
  /** "store": the store sends it out and closes it itself (خارج للتوصيل, تم التوصيل). */
  deliveredBy: DeliveredBy;
}

/** How many of the store's orders are in each status (طلباتى tabs, the account's orders count). */
export type PartnerOrderCounts = Record<OrderStatus, number>;

/** The live socket (§12 S3): events sent to a store's partners (delivery men: DRIVER_SOCKET_EVENTS). */
export const ORDER_SOCKET_EVENTS = {
  /** A customer placed an order at this store: { order: PartnerOrder }. */
  placed: 'order.placed',
  /** One of the store's orders changed status: { id, status }. */
  status: 'order.status',
} as const;

/** What a partner may change on their store (§11.1): hours, open now and the cover. */
export interface PartnerStoreInput {
  opensAt: string;
  closesAt: string;
  closedNow: boolean;
  cover: string | null;
}

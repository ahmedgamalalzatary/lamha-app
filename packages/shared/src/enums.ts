// Enums and their labels, in Tawsilty's words (contract §2, §8.9, §9, §11).
import type { Locale } from './format.js';

type Labels<T extends string> = Record<T, Record<Locale, string>>;

export const ROLES = ['customer', 'partner', 'driver', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const ROLE_LABELS: Labels<Role> = {
  customer: { ar: 'عميل', en: 'Customer' },
  partner: { ar: 'مورد', en: 'Partner' },
  driver: { ar: 'مندوب', en: 'Driver' },
  admin: { ar: 'مدير', en: 'Admin' },
};

/** Store types (contract §11 الموردين). Home tiles point at one of these or at a single store. */
export const VERTICALS = ['restaurant', 'market', 'pharmacy', 'courier'] as const;
export type Vertical = (typeof VERTICALS)[number];

const VERTICAL_LABELS: Labels<Vertical> = {
  restaurant: { ar: 'المطاعم', en: 'Restaurants' },
  market: { ar: 'ماركت', en: 'Markets' },
  pharmacy: { ar: 'صيدليات', en: 'Pharmacies' },
  courier: { ar: 'اطلب دليفري', en: 'Send anything' },
};

/** Order flow as the store and the admin see it (contract §9), plus the cancelled pill from the driver history (§10). */
export const ORDER_STATUSES = [
  'pending_review',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'rejected',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_STATUS_LABELS: Labels<OrderStatus> = {
  pending_review: { ar: 'قيد المراجعة', en: 'Under review' },
  preparing: { ar: 'قيد التجهيز', en: 'Preparing' },
  ready: { ar: 'تم التجهيز', en: 'Ready' },
  out_for_delivery: { ar: 'جارية التوصيل', en: 'Out for delivery' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

/** Address type chips (contract §8.9). */
export const ADDRESS_TYPES = ['apartment', 'office', 'villa'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

const ADDRESS_TYPE_LABELS: Labels<AddressType> = {
  apartment: { ar: 'شقة', en: 'Apartment' },
  office: { ar: 'مكتب', en: 'Office' },
  villa: { ar: 'فيلا', en: 'Villa' },
};

export const roleLabel = (v: Role, locale: Locale = 'ar') => ROLE_LABELS[v][locale];
export const verticalLabel = (v: Vertical, locale: Locale = 'ar') => VERTICAL_LABELS[v][locale];
export const orderStatusLabel = (v: OrderStatus, locale: Locale = 'ar') => ORDER_STATUS_LABELS[v][locale];
export const addressTypeLabel = (v: AddressType, locale: Locale = 'ar') => ADDRESS_TYPE_LABELS[v][locale];

export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);
export const isOrderStatus = (v: unknown): v is OrderStatus => ORDER_STATUSES.includes(v as OrderStatus);

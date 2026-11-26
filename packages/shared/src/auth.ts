// Sign-up and sign-in rules and API shapes (contract §8.1), shared by the API and the apps.
import { AUTH } from './constants.js';
import type { Role } from './enums.js';
import type { Locale } from './format.js';

/** 8 characters at least, any letters, numbers or symbols, no spaces (§8.1). */
export const isValidPassword = (password: string) =>
  password.length >= AUTH.passwordMinLength && !/\s/.test(password);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** "ahmed@gmail.com" → "a***d@gmail.com". */
export function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@');
  const last = name.length > 2 ? name.slice(-1) : '';
  return `${name.slice(0, 1)}***${last}@${domain}`;
}

export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * Why a code is asked for: a new customer account, a forgotten password, or a customer moving the
 * account to a new number ('phone'; the code still goes to the account email), or to a new email
 * ('email'; the code goes to the new address, proving it is theirs).
 */
export type OtpPurpose = 'signup' | 'reset' | 'phone' | 'email';

/** The signed-in account, as /me returns it. */
export interface Me {
  id: number;
  role: Role;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  region: string | null;
  locale: Locale;
  /** The profile photo's path under /uploads, or null for the initials. */
  avatar: string | null;
  /** Customers only: the code friends type when they sign up. */
  inviteCode: string | null;
  /** "تفعيل الإشعار" (§8.14): off, no push reaches this account; الإشعارات still fills. */
  notificationsEnabled: boolean;
}

export interface AuthResponse {
  user: Me;
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

/** The phone step's answer: a registered phone goes on to the password, a new one to sign-up. */
export interface PhoneStatus {
  registered: boolean;
}

/** A code was emailed. */
export interface OtpSent {
  /** Where it went: the typed address on sign-up, masked on a password reset. */
  email: string;
  /** Seconds before another code can be asked for. */
  resendIn: number;
}

/** The code was right: the ticket finishes the sign-up or the password reset. */
export interface OtpVerified {
  ticket: string;
}

/** An account an admin manages (admins now; partners and drivers in their phases). */
export interface StaffAccount {
  id: number;
  role: Role;
  phone: string;
  firstName: string;
  lastName: string;
  disabled: boolean;
  /** ISO time. */
  createdAt: string;
  /** The signed-in admin's own account. */
  you: boolean;
}

/** A created account, or a reset, with the generated password. It is shown once and never stored in clear. */
export interface GeneratedPassword {
  password: string;
}

export interface CreatedAccount extends GeneratedPassword {
  account: StaffAccount;
}

/** Machine-readable reasons the API gives with an error, translated by the apps. */
export type ApiErrorCode =
  | 'OWN_ACCOUNT'
  /** Disabling this admin would leave no enabled admin. */
  | 'LAST_ADMIN'
  | 'ACCOUNT_NOT_FOUND'
  /** A store, category, product, cuisine or home tile that does not exist. */
  | 'NOT_FOUND'
  | 'CART_STORE_CONFLICT'
  | 'CART_STORE_CLOSED'
  | 'CART_ITEM_UNAVAILABLE'
  | 'CART_PICKUP_UNAVAILABLE'
  | 'CART_MINIMUM_ORDER'
  | 'CART_QUANTITY_LIMIT'
  /** The cart changed since the checkout screen loaded (another device, or an edit). */
  | 'CHECKOUT_CART_CHANGED'
  /** The bill on the server differs from the one the customer saw; the app shows the new one. */
  | 'CHECKOUT_TOTAL_CHANGED'
  /** The delivery address is not the customer's, or is outside the store's zone. */
  | 'CHECKOUT_ADDRESS'
  /** The store has no location on the map, so a delivery cannot be priced. */
  | 'CHECKOUT_NO_STORE_LOCATION'
  /** The later-delivery slot is no longer offered. */
  | 'CHECKOUT_SLOT'
  /** A retried "تنفيذ الطلب" changed the time or the address after the order already went. */
  | 'CHECKOUT_ALREADY_PLACED'
  /** The order already moved on (another partner, or a second tap): the store sees its status now. */
  | 'ORDER_STATUS'
  /** The admin's deduction is more than the wallet holds (never below 0, §8.15). */
  | 'WALLET_BALANCE'
  /** The admin's deduction is more points than the customer has. */
  | 'POINTS_BALANCE'
  /** "وفر على طلبك" (§8.7): no such code now (unknown, switched off or out of its dates). */
  | 'COUPON_NOT_FOUND'
  /** The code is for another store. */
  | 'COUPON_STORE'
  /** The items are below the code's minimum order. */
  | 'COUPON_MIN_ORDER'
  /** This customer used it as many times as it allows. */
  | 'COUPON_USED'
  /** Everyone together used it up. */
  | 'COUPON_GONE'
  /** The admin's new code matches another one, however it is typed. */
  | 'COUPON_CODE_TAKEN'
  /** Another delivery man took the offer first, or the admin assigned it. */
  | 'OFFER_TAKEN'
  /** "بدء نوبة العمل" outside its window (30 min before to 15 min after), or no shift to start. */
  | 'SHIFT_NOT_OPEN'
  /** Offers and extensions need a shift running now. */
  | 'NOT_ON_SHIFT'
  /** Blocked for skipping; offers return when the block ends. */
  | 'DRIVER_BLOCKED'
  /** No extensions left this shift. */
  | 'EXTEND_LIMIT'
  /** The order already has the customer's rating (one per order). */
  | 'ALREADY_RATED'
  /** A category that still holds products or sub-categories cannot be deleted. */
  | 'CATEGORY_NOT_EMPTY'
  /** A product's category, or a sub-category's main category, belongs to another store. */
  | 'CATEGORY_OTHER_STORE'
  /** Sub-categories are one level deep (§8.4). */
  | 'CATEGORY_DEPTH'
  /** An option group asks for more choices than it has rows (§8.5). */
  | 'OPTION_GROUP'
  /** A partner account with no store (contract §2). */
  | 'NO_STORE'
  /** The upload is not an image the server can read. */
  | 'IMAGE_INVALID'
  /** A home tile must open exactly one vertical or one store. */
  | 'TILE_TARGET'
  /** The address's spot is in no delivery zone (§8.9). */
  | 'OUT_OF_ZONE'
  /** A zone outline with repeated corners, no area or crossing edges (shared `zoneShapeError`). */
  | 'ZONE_SHAPE'
  /** Two writes clashed at the same moment (a row deleted meanwhile, a deadlock): try again. */
  | 'CONFLICT'
  | 'PHONE_TAKEN'
  | 'EMAIL_TAKEN'
  | 'PHONE_NOT_FOUND'
  | 'STAFF_RESET_BY_ADMIN'
  | 'OTP_TOO_SOON'
  | 'OTP_WRONG'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'TICKET_INVALID'
  | 'INVITE_CODE_INVALID'
  | 'BAD_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'SESSION_EXPIRED'
  | 'WRONG_PASSWORD';

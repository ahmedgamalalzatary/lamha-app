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

/** Why a code is asked for: a new customer account, or a forgotten password. */
export type OtpPurpose = 'signup' | 'reset';

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
  /** Customers only: the code friends type when they sign up. */
  inviteCode: string | null;
}

export interface AuthResponse {
  user: Me;
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
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
  | 'ACCOUNT_NOT_FOUND'
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

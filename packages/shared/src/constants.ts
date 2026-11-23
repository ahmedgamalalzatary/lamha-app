// Fixed product rules. They live in code, not in .env: .env holds only secrets and the values
// that change between machines (URLs, ports, database).

/** Phone sign-up code (contract §8.1). Length and resend wait match Tawsilty's OTP screen. */
export const OTP = {
  length: 4,
  resendSeconds: 59,
  validSeconds: 300,
  maxAttempts: 5,
} as const;

/** Sessions: a short access token plus a long refresh token kept in the phone's secure storage. */
export const AUTH = {
  accessTokenTtl: '15m',
  refreshTokenDays: 30,
  /** Sign-in, sign-up and OTP requests per minute per IP. */
  rateLimitPerMinute: 10,
  passwordMinLength: 8,
  nameMaxLength: 100,
} as const;

/** Uploaded images, relative to apps/api. Served at /uploads in dev and by nginx in production. */
export const UPLOADS_DIR = 'uploads';

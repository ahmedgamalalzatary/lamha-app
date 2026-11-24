import { createHash } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { type AuthResponse, OTP, type OtpPurpose, type Role } from '@tawsela/shared';
import { createConnection, type ResultSetHeader } from 'mysql2/promise';
import { API_URL, mobileTestDbUrl } from './env';

/** The password every account made here signs in with. */
export const PASSWORD = 'secret123';

const connect = () => createConnection({ uri: mobileTestDbUrl() });

/** Runs one SQL statement against the app tests' database. */
export async function sql<T = unknown>(statement: string, params: unknown[] = []): Promise<T> {
  const conn = await connect();
  try {
    const [rows] = await conn.query(statement, params);
    return rows as T;
  } finally {
    await conn.end();
  }
}

/** Empties every app table, so each test starts from a clean database. */
export async function resetDb(): Promise<void> {
  const conn = await connect();
  try {
    const [rows] = await conn.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '__drizzle_migrations'",
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of rows as { name: string }[]) await conn.query(`TRUNCATE TABLE \`${name}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
}

interface NewAccount {
  email?: string | null;
  firstName?: string;
  lastName?: string;
  inviteCode?: string | null;
}

/** Adds an account row, as sign-up, the seed or an admin would. */
export async function insertUser(role: Role, phone: string, account: NewAccount = {}): Promise<number> {
  const res = await sql<ResultSetHeader>(
    'INSERT INTO users (role, phone, email, first_name, last_name, password_hash, invite_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      role,
      phone,
      account.email ?? null,
      account.firstName ?? 'احمد',
      account.lastName ?? 'الزعتري',
      await hash(PASSWORD),
      account.inviteCode ?? null,
    ],
  );
  return res.insertId;
}

/**
 * The code the API just emailed. Only its hash is stored, so this tries all 10,000 codes, the way
 * the API hashes them (sha256 of "phone:purpose:code").
 */
export async function emailedCode(phone: string, purpose: OtpPurpose): Promise<string> {
  const [row] = await sql<{ code_hash: string }[]>(
    'SELECT code_hash FROM otp_codes WHERE phone = ? AND purpose = ? ORDER BY id DESC LIMIT 1',
    [phone, purpose],
  );
  if (!row) throw new Error(`No code was sent to ${phone}`);
  for (let n = 0; n < 10 ** OTP.length; n++) {
    const code = String(n).padStart(OTP.length, '0');
    if (createHash('sha256').update(`${phone}:${purpose}:${code}`).digest('hex') === row.code_hash) return code;
  }
  throw new Error('The stored code matches no 4-digit code');
}

/** Signs in through the real API (to start a test already signed in). */
export async function signInAs(phone: string, password = PASSWORD): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(`Sign-in failed: ${res.status}`);
  return (await res.json()) as AuthResponse;
}

/**
 * Moves every refresh token a minute into the past: a rotated token sent again within
 * AUTH.refreshGraceSeconds still works (a lost answer), so tests that check rotation step past that.
 */
export async function pastRefreshGrace(): Promise<void> {
  await sql('UPDATE refresh_tokens SET created_at = created_at - INTERVAL 1 MINUTE');
}

/** Whether this refresh token still works on the server. */
export async function refreshWorks(refreshToken: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return res.ok;
}

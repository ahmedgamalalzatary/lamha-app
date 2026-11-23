import { hash } from '@node-rs/argon2';
import type { AuthResponse, Role } from '@tawsela/shared';
import { config } from 'dotenv';
import { createConnection, type ResultSetHeader } from 'mysql2/promise';
import { API_URL, webTestDbUrl } from './env';

config({ path: '../../.env.test', override: true, quiet: true });

export const PASSWORD = 'secret123';

const connect = () => createConnection({ uri: webTestDbUrl() });

/** Runs one SQL statement against the dashboard tests' database. */
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
  const [rows] = await conn.query(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '__drizzle_migrations'",
  );
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { name } of rows as { name: string }[]) await conn.query(`TRUNCATE TABLE \`${name}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
}

/** Adds an account row, as the seed or an admin would. */
export async function insertUser(role: Role, phone: string, firstName = 'أحمد', lastName = ''): Promise<number> {
  const res = await sql<ResultSetHeader>(
    'INSERT INTO users (role, phone, first_name, last_name, password_hash) VALUES (?, ?, ?, ?, ?)',
    [role, phone, firstName, lastName, await hash(PASSWORD)],
  );
  return res.insertId;
}

/** Signs in through the real API and stores the session, as a reload of a signed-in tab would find it. */
export async function signInAs(phone: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Sign-in failed: ${res.status}`);
  const auth = (await res.json()) as AuthResponse;
  window.localStorage.setItem('tawsela.dashboard.session', JSON.stringify(auth));
  return auth;
}

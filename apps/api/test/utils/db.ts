import { hash } from '@node-rs/argon2';
import type { Role } from '@tawsela/shared';
import { createConnection, type ResultSetHeader } from 'mysql2/promise';

const connect = () => createConnection({ uri: process.env.DATABASE_URL! });

/** Empties every app table, so each test file starts from a clean database. */
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

/** Runs one SQL statement against the test database (to set up or inspect rows). */
export async function sql<T = unknown>(statement: string, params: unknown[] = []): Promise<T> {
  const conn = await connect();
  try {
    const [rows] = await conn.query(statement, params);
    return rows as T;
  } finally {
    await conn.end();
  }
}

/** Adds an account directly, as the admin's account creation (Phase 4) or the seed would. */
export async function insertUser(role: Role, phone: string, password: string, email: string | null = null): Promise<number> {
  const res = await sql<ResultSetHeader>(
    'INSERT INTO users (role, phone, email, first_name, last_name, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [role, phone, email, 'Test', role, await hash(password)],
  );
  return res.insertId;
}

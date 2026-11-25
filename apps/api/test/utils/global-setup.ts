import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { runMigrations } from '../../src/core/db/migrate.js';

/**
 * Runs once before the e2e suite: rebuild the root .env.test's database (tawsela_test by default; any
 * name ending in _test, so two checkouts can test side by side) from the migrations.
 */
export default async function setup() {
  config({ path: '../../.env.test', override: true, quiet: true });
  const url = process.env.DATABASE_URL!;
  const name = url?.match(/\/(\w+_test)(\?|$)/)?.[1];
  if (!name) throw new Error("e2e tests must run against a database whose name ends in _test (.env.test's DATABASE_URL)");
  const conn = await createConnection({ uri: url });
  // The URL check can be fooled (a #fragment); ask the server which database this really is.
  const [[current]] = await conn.query<any[]>('SELECT DATABASE() AS db');
  if (current?.db !== name) {
    await conn.end();
    throw new Error(`e2e tests must run against ${name}, not ${String(current?.db)}`);
  }
  const [rows] = await conn.query<any[]>(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { t } of rows) await conn.query(`DROP TABLE \`${t}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
  // Phase 0 has no tables yet, so there may be no migrations to run.
  if (existsSync('./drizzle/meta/_journal.json')) await runMigrations(url);
}

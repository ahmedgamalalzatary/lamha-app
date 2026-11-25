import { config } from 'dotenv';

// The root .env.test names the databases and the API port, so two checkouts can test side by side.
config({ path: '../../.env.test', override: true, quiet: true });

/** The API the dashboard tests talk to: NEXT_PUBLIC_API_URL from the root .env.test (vitest.config.e2e.ts gives the app the same). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/v1';

const TEST_DB = /\/(\w+)_test(\?|$)/;
const base = process.env.DATABASE_URL?.match(TEST_DB)?.[1];
if (!base) throw new Error(".env.test's DATABASE_URL must name a database ending in _test");

/** The dashboard tests' own database, named after the root .env.test's: tawsela_test → tawsela_web_test. */
export const DB_NAME = `${base}_web_test`;

/** The root .env.test's database URL, pointed at the dashboard tests' own database. */
export const webTestDbUrl = (): string => process.env.DATABASE_URL!.replace(TEST_DB, `/${DB_NAME}$2`);

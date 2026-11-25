import path from 'node:path';
import { config } from 'dotenv';

// The root .env.test names the databases and the API port, so two checkouts can test side by side.
config({ path: path.resolve(__dirname, '../../../../.env.test'), override: true, quiet: true });

/**
 * The API the app tests talk to: the real one, started by global-setup.ts. MOBILE_TEST_API_URL from
 * the root .env.test, else port 4002 (the dashboard tests' API uses NEXT_PUBLIC_API_URL, 4001).
 */
export const API_URL = process.env.MOBILE_TEST_API_URL ?? 'http://localhost:4002/v1';

const TEST_DB = /\/(\w+)_test(\?|$)/;
const base = process.env.DATABASE_URL?.match(TEST_DB)?.[1];
if (!base) throw new Error(".env.test's DATABASE_URL must name a database ending in _test");

/** The app tests' own database, named after the root .env.test's: tawsela_test → tawsela_mobile_test. */
export const DB_NAME = `${base}_mobile_test`;

/** The root .env.test's database URL, pointed at the app tests' own database. */
export const mobileTestDbUrl = (): string => process.env.DATABASE_URL!.replace(TEST_DB, `/${DB_NAME}$2`);

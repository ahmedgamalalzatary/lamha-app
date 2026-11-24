/** The API the app tests talk to: the real one, started by global-setup.ts (the dashboard tests use 4001). */
export const API_URL = 'http://localhost:4002/v1';

export const DB_NAME = 'tawsela_mobile_test';

/** The root .env.test's database URL, pointed at the app tests' own database. */
export function mobileTestDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !/\/tawsela_test(\?|$)/.test(url)) throw new Error('.env.test must point DATABASE_URL at tawsela_test');
  return url.replace(/\/tawsela_test(\?|$)/, `/${DB_NAME}$1`);
}

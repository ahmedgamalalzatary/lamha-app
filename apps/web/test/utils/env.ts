/** The API the dashboard tests talk to (vitest.config.ts sets the same URL for the app code). */
export const API_URL = 'http://localhost:4001/v1';

export const DB_NAME = 'tawsela_web_test';

/** The root .env.test's database URL, pointed at the dashboard tests' own database. */
export function webTestDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !/\/tawsela_test(\?|$)/.test(url)) throw new Error('.env.test must point DATABASE_URL at tawsela_test');
  return url.replace(/\/tawsela_test(\?|$)/, `/${DB_NAME}$1`);
}

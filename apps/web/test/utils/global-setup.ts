import { type ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { API_URL, DB_NAME, webTestDbUrl } from './env';

const apiDir = fileURLToPath(new URL('../../../api', import.meta.url));

/** Runs a built API script (apps/api/dist) with the test env. */
function node(script: string, env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(process.execPath, [script], { cwd: apiDir, env, stdio: ['ignore', 'ignore', 'inherit'] });
}

async function waitForHealth(api: ChildProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (api.exitCode !== null) throw new Error(`The API stopped (exit ${api.exitCode})`);
    // Each try is bounded, so an API that accepts but never answers cannot stall past the deadline.
    const wait = Math.max(1, Math.min(2_000, deadline - Date.now()));
    const ok = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(wait) }).then((r) => r.ok, () => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('The API did not answer /v1/health within 30 s');
}

/**
 * The dashboard tests use the real API (apps/api/dist, built first by turbo) on its own database,
 * tawsela_web_test, so they never touch the API's e2e database or the dev data.
 */
export default async function setup() {
  config({ path: '../../.env.test', override: true, quiet: true });
  const url = webTestDbUrl();
  // An API left from an interrupted run would answer instead of the fresh one.
  const busy = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2_000) }).then(
    () => true,
    () => false,
  );
  if (busy) throw new Error(`Something already answers on ${API_URL}: stop the API left from an earlier test run`);

  const server = await createConnection({ uri: url.replace(/\/[^/?]+(\?|$)/, '/$1') });
  await server.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await server.query(`USE \`${DB_NAME}\``);
  const [rows] = await server.query('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()');
  await server.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { t } of rows as { t: string }[]) await server.query(`DROP TABLE \`${t}\``);
  await server.query('SET FOREIGN_KEY_CHECKS = 1');
  await server.end();

  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, PORT: new URL(API_URL).port };
  const migrate = node('dist/core/db/run-migrations.js', env);
  const code = await new Promise<number | null>((resolve) => migrate.on('exit', resolve));
  if (code !== 0) throw new Error(`Migrations failed (exit ${code})`);

  const api = node('dist/main.js', env);
  try {
    await waitForHealth(api);
  } catch (e) {
    api.kill();
    throw e;
  }
  return () => {
    api.kill();
  };
}

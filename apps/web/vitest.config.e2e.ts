import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// The API's address comes from the root .env.test, like test/utils/env.ts, so two checkouts can test side by side.
const testEnv = config({ path: '../../.env.test', quiet: true, processEnv: {} }).parsed ?? {};

// Page and API tests: the real API (test/utils/global-setup.ts) on one database (tawsela_web_test by default),
// which every test resets. So the files run one after another. Unit tests: vitest.config.ts.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/e2e/**/*.test.{ts,tsx}'],
    // jsdom with Node's FormData and File, so uploads reach the real API (test/utils/environment.ts).
    environment: './test/utils/environment.ts',
    setupFiles: ['test/setup.ts'],
    globalSetup: ['test/utils/global-setup.ts'],
    // Same order as test/utils/env.ts (the file, then the shell, then 4001), so pages and the test API agree.
    env: { NEXT_PUBLIC_API_URL: testEnv.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/v1' },
    fileParallelism: false,
    testTimeout: 15_000,
  },
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Page and API tests: the real API (test/utils/global-setup.ts) on one database, tawsela_web_test,
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
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4001/v1' },
    fileParallelism: false,
    testTimeout: 15_000,
  },
});

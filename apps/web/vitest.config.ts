import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests: no database and no API, so the files run in parallel.
// Page and API tests (the real API on tawsela_web_test) are in vitest.config.e2e.ts.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Next compiles JSX itself; vitest needs to be told the automatic runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/unit/**/*.test.{ts,tsx}'],
    environment: './test/utils/environment.ts',
    setupFiles: ['test/setup.ts'],
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4001/v1' },
  },
});

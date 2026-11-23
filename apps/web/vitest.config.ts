import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Next compiles JSX itself; vitest needs to be told the automatic runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    // The page tests talk to the real API on its own test database (test/utils/global-setup.ts).
    globalSetup: ['test/utils/global-setup.ts'],
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4001/v1' },
    // One database for all files: run them one after another.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});

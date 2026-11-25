// Runs before the test framework loads: tests read the root .env.test, never .env.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test'), override: true, quiet: true });
// The app tests talk to the real API that test/utils/global-setup.ts starts on its own port and database
// (MOBILE_TEST_API_URL in .env.test, else 4002; keep in step with test/utils/env.ts).
process.env.EXPO_PUBLIC_API_URL = process.env.MOBILE_TEST_API_URL ?? 'http://localhost:4002/v1';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { cookieJar, withCookieJar } from './utils/cookies';

// Node's fetch keeps no cookies; the dashboard's session cookie needs a browser's jar.
globalThis.fetch = withCookieJar(globalThis.fetch);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  cookieJar.clear();
});

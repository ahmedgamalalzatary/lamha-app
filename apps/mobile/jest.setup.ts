// Runs before every test file.
// The tests talk to the real API (test/utils/global-setup.ts). Expo installs `expo/fetch` as the
// global fetch when its runtime loads, and under Jest its native module is a stub. Load that
// runtime now, then put Node's fetch (from test/utils/environment.js) over it.
require('expo/src/winter');
const nodeFetch = (globalThis as { __nodeFetch?: typeof fetch }).__nodeFetch;
if (!nodeFetch) throw new Error("test/utils/environment.js did not hand in Node's fetch");
Object.defineProperty(globalThis, 'fetch', { value: nodeFetch, writable: true, configurable: true, enumerable: true });
// Rendering the router turns Jest's fake timers on, and the MySQL driver in test/utils/db.ts
// waits on timers: every test starts on real ones (a test may still switch to fake timers).
beforeEach(() => {
  jest.useRealTimers();
});

// AsyncStorage has no native module under Jest, so use its official mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Safe-area insets need native code; use the library's own mock (zero insets).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Haptics buzz the phone; tests see which buzz was asked for.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Gesture Handler binds to the UI runtime, which Jest (running worklets as plain JS) does not have.
jest.mock('react-native-worklets', () => ({ ...jest.requireActual('react-native-worklets'), getUIRuntimeHolder: () => ({}) }));

// expo-secure-store has no native module under Jest: keep values in memory.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

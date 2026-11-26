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
  require('@/features/addresses/chosen-address').resetChosenAddresses();
  // Screens rendered without a test client share the app's own: no data carries into the next test.
  require('@/core/query').queryClient.clear();
});

// React Query hands its updates on with setTimeout. renderRouter renders under fake timers and the
// tests then go back to real ones, which drops any update queued in between (the screen stays on
// its skeleton). A microtask is not a timer, so updates always land.
require('@tanstack/react-query').notifyManager.setScheduler(queueMicrotask);
// The app's own client (screens rendered without a test client use it): no 5-minute garbage-collection
// timer, which would keep Jest from exiting for those 5 minutes (test/utils/render.ts testQueryClient).
require('@/core/query').queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } });

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

// expo-clipboard's own mock keeps nothing; keep the copied text in memory so tests can read it back.
jest.mock('expo-clipboard', () => {
  let text = '';
  return {
    setStringAsync: jest.fn(async (value: string) => {
      text = value;
      return true;
    }),
    getStringAsync: jest.fn(async () => text),
  };
});

// The date picker is native (its iOS view sets its date by a native command): a plain view that hands
// on the props, so a test sends a picked date with fireEvent(picker, 'onValueChange', event, date).
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => createElement(View, props),
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

// expo-notifications has no native module under Jest: permission granted and a fixed test token.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[jest-device]' })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
}));

// expo-secure-store has no native module under Jest: keep values in memory.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

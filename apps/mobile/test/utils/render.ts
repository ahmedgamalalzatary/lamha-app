import { renderRouter } from 'expo-router/testing-library';

/**
 * expo-router's renderRouter turns Jest's fake timers on. These screens wait on the real API, and
 * under fake timers `findBy…` gives up before the answer arrives, so go back to real timers.
 * (A test about a countdown calls renderRouter itself and keeps the fake timers.)
 */
export async function renderApp(...args: Parameters<typeof renderRouter>) {
  const result = await renderRouter(...args);
  jest.useRealTimers();
  return result;
}

import { QueryClient } from '@tanstack/react-query';
import { renderRouter } from 'expo-router/testing-library';

/**
 * A fresh React Query client for one test. gcTime Infinity: the default 5-minute garbage-collection
 * timer outlives the test and keeps Jest from exiting for those 5 minutes.
 */
export const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });

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

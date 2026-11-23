import { QueryClient } from '@tanstack/react-query';

/** One client for the whole app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

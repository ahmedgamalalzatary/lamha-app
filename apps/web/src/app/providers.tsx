'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';
import { useSession } from '@/core/api/client';

/**
 * One data cache per signed-in account: signing out, or in as someone else, starts an empty one,
 * so no account ever sees another's cached data (a renewed token keeps the same account's cache).
 */
export function Providers({ children }: { children: ReactNode }) {
  const accountId = useSession()?.user.id ?? null;
  const client = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new cache for each account
    [accountId],
  );
  // The key remounts the pages too: a mounted query stays bound to the client it started with.
  return (
    <QueryClientProvider key={accountId ?? 'none'} client={client}>
      {children}
    </QueryClientProvider>
  );
}

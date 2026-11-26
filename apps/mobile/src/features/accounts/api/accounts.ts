import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DriverAccount, PartnerAccount } from '@tawsela/shared';
import { driversApi } from './drivers';
import { partnersApi } from './partners';

export type Account = PartnerAccount | DriverAccount;
/** Partners belong to a store; drivers do not (contract §2). */
export type Kind = 'partner' | 'driver';

export const apiOf = (kind: Kind) => (kind === 'partner' ? partnersApi : driversApi);

export function useAccounts(kind: Kind, search: string) {
  // While a new search loads, the last results stay on screen instead of skeletons, but only within
  // the same tab: a partner card left showing under المندوبين would send its id to the drivers' API.
  return useQuery<Account[]>({
    queryKey: ['admin', `${kind}s`, search],
    queryFn: () => apiOf(kind).list(search),
    placeholderData: (previous, query) => (query?.queryKey[1] === `${kind}s` ? keepPreviousData(previous) : undefined),
  });
}

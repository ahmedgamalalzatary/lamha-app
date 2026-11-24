import type { Me, Role } from '@tawsela/shared';
import type { SessionStatus } from '../auth/session';

/** Which part of the app a route belongs to: the sign-in screens, a role's tabs, or the shared account screens. */
export type Area = 'auth' | 'account' | Role;

/**
 * Where a visitor of this area must go instead, if anywhere (contract §2, §8.1: the app opens on
 * the welcome screen; after sign-in, the account's role picks the tabs). 'wait' while the session is read.
 */
export function gate(status: SessionStatus, user: Me | null, area: Area): string | null | 'wait' {
  if (status === 'loading' || status === 'offline') return 'wait';
  if (status === 'signedOut' || !user) return area === 'auth' ? null : '/welcome';
  const home = `/${user.role}`;
  if (area === 'auth') return home;
  if (area === 'account' || area === user.role) return null;
  return home;
}

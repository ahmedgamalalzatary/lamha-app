import type { AuthResponse, Role } from '@tawsela/shared';
import { DASHBOARD_ROLES } from '@/core/api/create-api';

/** The dashboard's parts: the admin area, the partner area (`/partner`) and the sign-in page. */
export type Area = 'admin' | 'partner' | 'sign-in';

/** Where an account lands after sign-in. */
export function homeOf(role: Role): string {
  return role === 'partner' ? '/partner/orders' : '/';
}

/**
 * Where to send the visitor of an area, or null to let them in ('wait' while storage is read).
 * The account's role decides its area; a partner never sees an admin page (contract §2, §11.1).
 */
export function areaRedirect(session: AuthResponse | null | undefined, area: Area): string | 'wait' | null {
  if (session === undefined) return 'wait';
  const role = session && DASHBOARD_ROLES.includes(session.user.role) ? session.user.role : null;
  if (!role) return area === 'sign-in' ? null : '/sign-in';
  if (area === role) return null;
  return homeOf(role);
}

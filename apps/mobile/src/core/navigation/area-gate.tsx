import { type Href, Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useSession } from '../auth/session';
import { type Area, gate } from './gate-rules';

/** Renders the area only for the right visitor; anyone else is sent where `gate` says. */
export function Gate({ area, children }: { area: Area; children: ReactNode }) {
  const { status, user } = useSession();
  const to = gate(status, user, area);
  if (to === 'wait') return null;
  if (to) return <Redirect href={to as Href} />;
  return children;
}

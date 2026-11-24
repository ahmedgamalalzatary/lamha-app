import { type Href, Redirect } from 'expo-router';
import { useSession } from '@/core/auth/session';

/** The app opens on sign-in; a signed-in account goes to its own tabs (contract §2). */
export default function Index() {
  const { status, user } = useSession();
  if (status === 'loading' || status === 'offline') return null;
  return <Redirect href={(user ? `/${user.role}` : '/sign-in') as Href} />;
}

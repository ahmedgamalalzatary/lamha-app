import { router } from 'expo-router';
import { useEffect } from 'react';
import { session, useSession } from '@/core/auth/session';
import { supportApi } from './api';

/** Sessions already asked: the popup comes once per app start, not on every return to the tabs. */
const asked = new Set<string>();

/**
 * When the app opens, the rating screen comes up by itself for the newest delivered order not yet
 * rated or closed [Owner, 2026-11-25]. ✕ there stops it for that order; the details keep "قيّم طلبك".
 */
export function RatePrompt() {
  const customerId = useSession((s) => (s.user?.role === 'customer' ? s.user.id : undefined));
  useEffect(() => {
    if (customerId === undefined) return;
    const generation = session.generation();
    const key = `${customerId}:${generation}`;
    if (asked.has(key)) return;
    asked.add(key);
    supportApi
      .prompt()
      .then(({ order }) => {
        if (order && session.generation() === generation) router.push({ pathname: '/rate/[id]', params: { id: String(order.id), from: 'prompt' } });
      })
      .catch(() => undefined);
  }, [customerId]);
  return null;
}

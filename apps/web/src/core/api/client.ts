'use client';

import type { AuthResponse } from '@tawsela/shared';
import { useSyncExternalStore } from 'react';
import { createApi, type TokenStore } from './create-api';

/** NEXT_PUBLIC_API_URL from the root .env. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/** An uploaded image's path ("/uploads/…") as a full URL on the API's server. */
export const mediaUrl = (path: string) => new URL(path, API_URL).href;

/**
 * The session lives in this page's memory only: the account and its short access token. The refresh
 * token is an HttpOnly cookie the browser keeps and page scripts cannot read (review F11), so a reload
 * signs in again from it. Undefined until that first check answers.
 */
let current: AuthResponse | null | undefined;
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};

/** Tells this browser's other dashboard tabs about a sign-in or a sign-out. */
const tabs = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tawsela-session') : null;

export const sessionStore: TokenStore = {
  load: () => current ?? null,
  save: (auth) => {
    const changedAccount = (current?.user.id ?? null) !== (auth?.user.id ?? null);
    current = auth;
    notify();
    if (changedAccount) tabs?.postMessage(auth ? 'in' : 'out');
  },
};

/** Tabs renew one at a time (navigator.locks), each with the cookie the last one left. */
const refreshLock = <T,>(fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks ? (navigator.locks.request('tawsela-refresh', fn) as Promise<T>) : fn();

export const api = createApi({ base: API_URL, fetch: (...a) => fetch(...a), store: sessionStore, refreshLock });

if (typeof window !== 'undefined') {
  // Sessions used to be kept in localStorage, refresh token included: never leave one there.
  try {
    window.localStorage.removeItem('tawsela.dashboard.session');
  } catch {
    // Storage may be blocked; there is then nothing to remove.
  }
  void api.restore();
  tabs?.addEventListener('message', (e: MessageEvent) => {
    // Another tab signed out: so does this one. It signed in: pick the session up from the cookie.
    if (e.data === 'out') {
      current = null;
      notify();
    } else if (e.data === 'in') void api.restore();
  });
}

/** Signed out in this page, as a fresh visit without a cookie (tests start each case from here). */
export function forgetSession() {
  current = null;
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The signed-in account, or null. Undefined until the page has checked its cookie (and on the server). */
export function useSession(): AuthResponse | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

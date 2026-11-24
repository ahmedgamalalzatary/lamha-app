'use client';

import type { AuthResponse } from '@tawsela/shared';
import { useSyncExternalStore } from 'react';
import { createApi, type TokenStore } from './create-api';

/** NEXT_PUBLIC_API_URL from the root .env. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/** An uploaded image's path ("/uploads/…") as a full URL on the API's server. */
export const mediaUrl = (path: string) => new URL(path, API_URL).href;

const KEY = 'tawsela.dashboard.session';
const listeners = new Set<() => void>();
let cached: AuthResponse | null | undefined;

const notify = () => {
  for (const l of listeners) l();
};

// Another tab signed in or out: drop the copy and let React know.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return;
    cached = undefined;
    notify();
  });
}

/** The session lives in localStorage, so a reload keeps the account signed in. */
const store: TokenStore = {
  load: () => {
    if (cached !== undefined) return cached;
    if (typeof window === 'undefined') return null;
    try {
      cached = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as AuthResponse | null;
    } catch {
      cached = null;
    }
    return cached;
  },
  save: (auth) => {
    cached = auth;
    try {
      if (auth) window.localStorage.setItem(KEY, JSON.stringify(auth));
      else window.localStorage.removeItem(KEY);
    } catch {
      // A private window may refuse storage; the session then lasts for this page only.
    }
    notify();
  },
};

const refreshLock = <T,>(fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks ? (navigator.locks.request('tawsela-refresh', fn) as Promise<T>) : fn();

export const api = createApi({ base: API_URL, fetch: (...a) => fetch(...a), store, refreshLock });

/** Drops the in-memory copy, so the next read comes from storage (tests start each case fresh). */
export function forgetSession() {
  cached = undefined;
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The signed-in account, or null. Undefined until the page has read storage (and on the server). */
export function useSession(): AuthResponse | null | undefined {
  return useSyncExternalStore(subscribe, store.load, () => undefined);
}

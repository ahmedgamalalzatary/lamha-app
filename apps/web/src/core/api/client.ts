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
export const sessionStore: TokenStore = {
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
      memoryOnly = false;
    } catch {
      // A private window may refuse storage; the session then lasts for this page only.
      memoryOnly = !!auth;
    }
    notify();
  },
};

/** The browser refused to store the session: the in-memory copy is the only one. */
let memoryOnly = false;

/**
 * Inside the lock the session is read from storage again, not from the copy: another tab may have
 * renewed it before this tab heard its storage event, and replaying the old token ends every session.
 * A session the browser would not store has no other copy, so it is kept.
 */
const refreshLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const fresh = () => {
    if (!memoryOnly) cached = undefined;
    return fn();
  };
  return typeof navigator !== 'undefined' && navigator.locks ? (navigator.locks.request('tawsela-refresh', fresh) as Promise<T>) : fresh();
};

export const api = createApi({ base: API_URL, fetch: (...a) => fetch(...a), store: sessionStore, refreshLock });

/** Drops the in-memory copy, so the next read comes from storage (tests start each case fresh). */
export function forgetSession() {
  cached = undefined;
  memoryOnly = false;
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
  return useSyncExternalStore(subscribe, sessionStore.load, () => undefined);
}

import type { ApiError, ApiErrorCode, AuthResponse, Role } from '@tawsela/shared';

/** The API's codes, plus the one the dashboard itself gives: an account the dashboard is not for. */
export type ErrorCode = ApiErrorCode | 'DASHBOARD_ROLE';

/** An API call that failed. `status` is 0 when the server could not be reached. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: ErrorCode,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * The page's copy of the session: the account and its short access token, in memory only. The
 * refresh token is never here: the browser keeps it in an HttpOnly cookie (review F11).
 */
export interface TokenStore {
  load: () => AuthResponse | null;
  save: (auth: AuthResponse | null) => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

interface Config {
  /** The API's `/v1` URL. */
  base: string;
  fetch: typeof fetch;
  store: TokenStore;
  /** The session ended (a renewal was refused). */
  onSignedOut?: () => void;
  /** Renews one tab at a time (navigator.locks in the browser), so a rotating token is never replayed. */
  refreshLock?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** The roles the dashboard opens for: admins (admin area) and partners (`/partner`), contract §2. */
export const DASHBOARD_ROLES: readonly Role[] = ['admin', 'partner'];

/**
 * The dashboard's API client (the realestate dashboard's pattern): phone + password sign-in for
 * admins and partners, the access token sent with each call and renewed once when it expires.
 */
export function createApi({ base, fetch, store, onSignedOut, refreshLock = (fn) => fn() }: Config) {
  let refreshing: Promise<boolean> | undefined;

  async function send(path: string, opts: RequestOptions, token: string | undefined): Promise<Response> {
    // The refresh token travels as the API's HttpOnly cookie; this header asks for that mode.
    const headers = new Headers({ accept: 'application/json', 'x-session': 'cookie' });
    // A form (an image upload) goes as multipart; fetch sets its content type and boundary.
    const form = opts.body instanceof FormData;
    if (opts.body !== undefined && !form) headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    try {
      return await fetch(base + path, {
        method: opts.method ?? 'GET',
        headers,
        credentials: 'include',
        body: opts.body === undefined ? undefined : form ? (opts.body as FormData) : JSON.stringify(opts.body),
      });
    } catch (e) {
      throw new ApiRequestError(0, e instanceof Error ? e.message : 'Network request failed');
    }
  }

  async function read<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!res.ok) {
      const err = data as ApiError | undefined;
      const m = err?.message;
      throw new ApiRequestError(res.status, (Array.isArray(m) ? m[0] : m) ?? `HTTP ${res.status}`, err?.code as ErrorCode | undefined);
    }
    return data as T;
  }

  /**
   * A new access token from the browser's refresh cookie (review F11). Requests that fail together
   * share one renewal, and tabs take turns (the lock): each renews with the cookie the last one left.
   * False only when the server refused the cookie; a server error throws and keeps the session.
   */
  function refreshOnce(): Promise<boolean> {
    refreshing ??= refreshLock(async () => {
      const who = store.load()?.user.id ?? null;
      const res = await send('/auth/refresh', { method: 'POST', body: {} }, undefined);
      if (res.status === 401 || res.status === 403) return false;
      const next = await read<AuthResponse>(res);
      const now = store.load()?.user.id ?? null;
      if (now !== who) {
        // Signed out while this renewal was on its way: end the session it just made, and its cookie.
        if (now === null) await send('/auth/logout', { method: 'POST', body: {} }, undefined).catch(() => undefined);
        return now !== null;
      }
      store.save(next);
      return true;
    }).finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }

  /** A page load: signed in again from the cookie, or signed out. True when signed in. */
  async function restore(): Promise<boolean> {
    const ok = await refreshOnce().catch(() => false);
    if (!ok && store.load() === null) store.save(null);
    return ok && store.load() !== null;
  }

  /**
   * A call made by one account is retried only for that account: after a sign-out, or a sign-in
   * as someone else, its 401 is just returned, never resent with the other account's token.
   */
  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const before = store.load();
    const sentWith = before?.accessToken;
    let res = await send(path, opts, sentWith);
    const sameAccount = () => !!before && store.load()?.user.id === before.user.id;
    if (res.status === 401 && sentWith && sameAccount()) {
      const now = store.load()!.accessToken;
      if (now !== sentWith) res = await send(path, opts, now);
      else if (await refreshOnce()) {
        if (sameAccount()) res = await send(path, opts, store.load()!.accessToken);
      } else if (sameAccount()) {
        store.save(null);
        onSignedOut?.();
      }
    }
    return read<T>(res);
  }

  /** Any other role is signed out again at once: customers and drivers use the mobile app. */
  async function signIn(phone: string, password: string): Promise<AuthResponse> {
    const auth = await read<AuthResponse>(await send('/auth/login', { method: 'POST', body: { phone, password } }, undefined));
    if (!DASHBOARD_ROLES.includes(auth.user.role)) {
      await send('/auth/logout', { method: 'POST', body: {} }, undefined).catch(() => undefined);
      throw new ApiRequestError(403, 'The dashboard is for admins and stores', 'DASHBOARD_ROLE');
    }
    store.save(auth);
    return auth;
  }

  /** The page forgets at once; the server ends the session and drops the cookie. */
  async function signOut(): Promise<void> {
    store.save(null);
    await send('/auth/logout', { method: 'POST', body: {} }, undefined).catch(() => undefined);
  }

  return { request, signIn, signOut, restore, session: () => store.load() };
}

export type Api = ReturnType<typeof createApi>;

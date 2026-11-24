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

/** Where the session is kept between visits (localStorage in the browser). */
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
    const headers = new Headers({ accept: 'application/json' });
    // A form (an image upload) goes as multipart; fetch sets its content type and boundary.
    const form = opts.body instanceof FormData;
    if (opts.body !== undefined && !form) headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    try {
      return await fetch(base + path, {
        method: opts.method ?? 'GET',
        headers,
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
   * Requests that fail together share one renewal. Inside the lock the store is read again: when
   * another tab already rotated the token, its fresh one is used instead of replaying ours (a
   * replay ends every session of the account). False only when the server refused the token.
   */
  function refreshOnce(): Promise<boolean> {
    const captured = store.load();
    refreshing ??= refreshLock(async () => {
      const cur = store.load();
      if (!cur) return false;
      if (captured && cur.refreshToken !== captured.refreshToken) return true;
      const res = await send('/auth/refresh', { method: 'POST', body: { refreshToken: cur.refreshToken } }, undefined);
      if (res.status === 401 || res.status === 403) return store.load()?.refreshToken !== cur.refreshToken;
      store.save(await read<AuthResponse>(res));
      return true;
    }).finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const sentWith = store.load()?.accessToken;
    let res = await send(path, opts, sentWith);
    if (res.status === 401 && sentWith) {
      const now = store.load()?.accessToken;
      if (now && now !== sentWith) res = await send(path, opts, now);
      else if (await refreshOnce()) res = await send(path, opts, store.load()?.accessToken);
      else {
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
      await send('/auth/logout', { method: 'POST', body: { refreshToken: auth.refreshToken } }, undefined).catch(() => undefined);
      throw new ApiRequestError(403, 'The dashboard is for admins and stores', 'DASHBOARD_ROLE');
    }
    store.save(auth);
    return auth;
  }

  async function signOut(): Promise<void> {
    const cur = store.load();
    store.save(null);
    if (cur) await send('/auth/logout', { method: 'POST', body: { refreshToken: cur.refreshToken } }, undefined).catch(() => undefined);
  }

  return { request, signIn, signOut, session: () => store.load() };
}

export type Api = ReturnType<typeof createApi>;

import type { AuthResponse, Me } from '@tawsela/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api as dashboardApi, forgetSession, sessionStore } from '@/core/api/client';
import { ApiRequestError, createApi, type TokenStore } from '@/core/api/create-api';
import { insertUser, PASSWORD, resetDb, sql } from '../utils/db';
import { API_URL } from '../utils/env';
import { pngFile, removeUpload } from '../utils/image';

/** The tests run against the real API and its test database (test/utils/global-setup.ts). */
function memoryStore(start: AuthResponse | null = null): TokenStore & { saved: AuthResponse | null } {
  const s = {
    saved: start,
    load: () => s.saved,
    save: (a: AuthResponse | null) => {
      s.saved = a;
    },
  };
  return s;
}

const client = (store = memoryStore(), onSignedOut?: () => void) => createApi({ base: API_URL, fetch: (...a) => fetch(...a), store, onSignedOut });

/** A session whose access token the API no longer accepts, as after 15 minutes. */
const expired = (auth: AuthResponse): AuthResponse => ({ ...auth, accessToken: `${auth.accessToken}x` });

/** Whether this refresh token still works on the server. */
const refreshWorks = async (refreshToken: string) =>
  (await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) })).ok;

beforeEach(async () => {
  await resetDb();
});

describe("the dashboard's API client (real API)", () => {
  it('signs an admin in with phone and password, then sends the access token', async () => {
    await insertUser('admin', '01000000001', 'أحمد');
    const store = memoryStore();
    const api = client(store);
    await api.signIn('01000000001', PASSWORD);
    expect(store.saved?.user).toMatchObject({ role: 'admin', firstName: 'أحمد' });
    await expect(api.request<Me>('/me')).resolves.toMatchObject({ phone: '01000000001' });
  });

  it('signs a partner in too (the /partner area)', async () => {
    await insertUser('partner', '01000000002');
    const store = memoryStore();
    await client(store).signIn('01000000002', PASSWORD);
    expect(store.saved?.user.role).toBe('partner');
  });

  it.each(['customer', 'driver'] as const)('turns a %s away, keeps nothing and ends the new session', async (role) => {
    await insertUser(role, '01011111111');
    const store = memoryStore();
    await expect(client(store).signIn('01011111111', PASSWORD)).rejects.toMatchObject({ status: 403, code: 'DASHBOARD_ROLE' });
    expect(store.saved).toBeNull();
    const [open] = await sql<{ n: number }[]>('SELECT COUNT(*) AS n FROM refresh_tokens WHERE revoked_at IS NULL');
    expect(open?.n).toBe(0);
  });

  it("keeps the API's error code", async () => {
    await insertUser('admin', '01000000001');
    await expect(client().signIn('01000000001', 'wrongpass')).rejects.toMatchObject({ status: 401, code: 'BAD_CREDENTIALS' });
  });

  it('uses the first validation message', async () => {
    await expect(client().signIn('0123', PASSWORD)).rejects.toMatchObject({ status: 400, message: 'phone must be an Egyptian mobile number' });
  });

  it('renews an expired access token once; two requests share one renewal', async () => {
    await insertUser('admin', '01000000001');
    const first = memoryStore();
    await client(first).signIn('01000000001', PASSWORD);
    const store = memoryStore(expired(first.saved!));
    const api = client(store);
    // A second renewal would replay the used refresh token, and the API would end every session.
    await expect(Promise.all([api.request<Me>('/me'), api.request<Me>('/me')])).resolves.toHaveLength(2);
    expect(store.saved?.refreshToken).not.toBe(first.saved!.refreshToken);
    expect(await refreshWorks(store.saved!.refreshToken)).toBe(true);
  });

  it('keeps a session the browser refused to store when it renews the access token', async () => {
    await insertUser('admin', '01000000001');
    forgetSession();
    window.localStorage.clear();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    try {
      await dashboardApi.signIn('01000000001', PASSWORD);
      const stale = expired(sessionStore.load()!);
      sessionStore.save(stale);
      await expect(dashboardApi.request<Me>('/me')).resolves.toMatchObject({ phone: '01000000001' });
      expect(sessionStore.load()?.accessToken).toEqual(expect.any(String));
      expect(sessionStore.load()?.accessToken).not.toBe(stale.accessToken);
    } finally {
      setItem.mockRestore();
      forgetSession();
    }
  });

  it('two tabs renew without replaying the same refresh token', async () => {
    await insertUser('admin', '01000000001');
    const start = memoryStore();
    await client(start).signIn('01000000001', PASSWORD);
    // One browser: both tabs share the stored session, and renew one at a time (navigator.locks).
    const shared = memoryStore(expired(start.saved!));
    let chain: Promise<unknown> = Promise.resolve();
    const refreshLock = <T,>(fn: () => Promise<T>): Promise<T> => {
      const run = chain.then(fn, fn);
      chain = run.catch(() => undefined);
      return run;
    };
    const tab = () => createApi({ base: API_URL, fetch: (...a) => fetch(...a), store: shared, refreshLock });
    await expect(Promise.all([tab().request<Me>('/me'), tab().request<Me>('/me')])).resolves.toHaveLength(2);
    expect(await refreshWorks(shared.saved!.refreshToken)).toBe(true);
  });

  it('does not bring a session back when its renewal answers after sign-out', async () => {
    await insertUser('admin', '01000000001');
    const first = memoryStore();
    await client(first).signIn('01000000001', PASSWORD);
    const store = memoryStore(expired(first.saved!));
    // The admin signs out while the renewal is on its way.
    const signOutMidway: typeof fetch = (input, init) => {
      if (String(input).endsWith('/auth/refresh')) store.save(null);
      return fetch(input, init);
    };
    const api = createApi({ base: API_URL, fetch: signOutMidway, store });
    await expect(api.request('/me')).rejects.toMatchObject({ status: 401 });
    expect(store.saved).toBeNull();
  });

  it('signs out when the session cannot be renewed', async () => {
    await insertUser('admin', '01000000001');
    const first = memoryStore();
    await client(first).signIn('01000000001', PASSWORD);
    const store = memoryStore({ ...expired(first.saved!), refreshToken: 'not-a-token' });
    const onSignedOut = vi.fn();
    await expect(client(store, onSignedOut).request('/me')).rejects.toMatchObject({ status: 401 });
    expect(store.saved).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  it('reports a server it cannot reach as status 0', async () => {
    const api = createApi({ base: 'http://localhost:9/v1', fetch: (...a) => fetch(...a), store: memoryStore() });
    const err = await api.request('/health').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 0 });
  });

  it('signs out: forgets the session and ends it on the server', async () => {
    await insertUser('admin', '01000000001');
    const store = memoryStore();
    const api = client(store);
    const { refreshToken } = await api.signIn('01000000001', PASSWORD);
    await api.signOut();
    expect(store.saved).toBeNull();
    expect(await refreshWorks(refreshToken)).toBe(false);
  });

  it('sends a form with a file as multipart (the image upload)', async () => {
    await insertUser('admin', '01000000001');
    const api = client();
    await api.signIn('01000000001', PASSWORD);
    const form = new FormData();
    form.append('image', pngFile());
    const { url } = await api.request<{ url: string }>('/admin/uploads', { method: 'POST', body: form });
    expect(url).toMatch(/^\/uploads\/catalog\/.+\.jpg$/);
    await removeUpload(url);
  });
});

import type { AuthResponse, Me } from '@tawsela/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApi, type TokenStore } from '@/core/api/create-api';
import { cookieJar } from '../utils/cookies';
import { cookieRenews, insertUser, PASSWORD, resetDb, sql } from '../utils/db';
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

const sessionCookie = () => cookieJar.get('tawsela_rt');

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("the dashboard's API client (real API)", () => {
  it('signs an admin in: page scripts never hold the refresh token, the browser keeps it as a cookie (review F11)', async () => {
    await insertUser('admin', '01000000001', 'أحمد');
    const store = memoryStore();
    const api = client(store);
    await api.signIn('01000000001', PASSWORD);
    expect(store.saved?.user).toMatchObject({ role: 'admin', firstName: 'أحمد' });
    expect(store.saved?.refreshToken).toBe('');
    expect(window.localStorage.length).toBe(0);
    expect(await cookieRenews(sessionCookie())).toBe(true);
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
    expect(sessionCookie()).toBeUndefined();
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

  it('renews an expired access token once from the cookie; two requests share one renewal', async () => {
    await insertUser('admin', '01000000001');
    const store = memoryStore();
    const api = client(store);
    await api.signIn('01000000001', PASSWORD);
    const before = sessionCookie();
    store.save(expired(store.saved!));
    await expect(Promise.all([api.request<Me>('/me'), api.request<Me>('/me')])).resolves.toHaveLength(2);
    expect(sessionCookie()).not.toBe(before);
    expect(await cookieRenews(sessionCookie())).toBe(true);
  });

  it('opens a reloaded page signed in from the cookie alone, and signed out without one', async () => {
    await insertUser('admin', '01000000001');
    await client().signIn('01000000001', PASSWORD);
    // A reload: nothing in the page's memory.
    const store = memoryStore();
    expect(await client(store).restore()).toBe(true);
    expect(store.saved?.user.phone).toBe('01000000001');
    await expect(client(store).request<Me>('/me')).resolves.toMatchObject({ phone: '01000000001' });

    cookieJar.clear();
    const empty = memoryStore();
    expect(await client(empty).restore()).toBe(false);
    expect(empty.saved).toBeNull();
  });

  it('two tabs renewing at the same moment both keep the session', async () => {
    await insertUser('admin', '01000000001');
    const first = memoryStore();
    await client(first).signIn('01000000001', PASSWORD);
    // One browser: both tabs share the cookie; each holds its own expired access token.
    const tab = () => client(memoryStore(expired(first.saved!)));
    await expect(Promise.all([tab().request<Me>('/me'), tab().request<Me>('/me')])).resolves.toHaveLength(2);
    await expect(tab().request<Me>('/me')).resolves.toMatchObject({ phone: '01000000001' });
  });

  it('does not bring a session back when its renewal answers after sign-out', async () => {
    await insertUser('admin', '01000000001');
    const store = memoryStore();
    const api = client(store);
    await api.signIn('01000000001', PASSWORD);
    store.save(expired(store.saved!));
    // The admin signs out while the renewal is on its way.
    const signOutMidway: typeof fetch = (input, init) => {
      if (String(input).endsWith('/auth/refresh')) store.save(null);
      return fetch(input, init);
    };
    await expect(createApi({ base: API_URL, fetch: signOutMidway, store }).request('/me')).rejects.toMatchObject({ status: 401 });
    expect(store.saved).toBeNull();
    expect(sessionCookie()).toBeUndefined();
    const [open] = await sql<{ n: number }[]>('SELECT COUNT(*) AS n FROM refresh_tokens WHERE revoked_at IS NULL');
    expect(open?.n).toBe(0);
  });

  it('signs out when the session cannot be renewed', async () => {
    await insertUser('admin', '01000000001');
    const first = memoryStore();
    await client(first).signIn('01000000001', PASSWORD);
    cookieJar.clear();
    const store = memoryStore(expired(first.saved!));
    const onSignedOut = vi.fn();
    await expect(client(store, onSignedOut).request('/me')).rejects.toMatchObject({ status: 401 });
    expect(store.saved).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  it('keeps the session when the server fails for a moment', async () => {
    await insertUser('admin', '01000000001');
    const store = memoryStore();
    await client(store).signIn('01000000001', PASSWORD);
    store.save(expired(store.saved!));
    const busy: typeof fetch = (input, init) =>
      String(input).endsWith('/auth/refresh') ? Promise.resolve(new Response('{}', { status: 503 })) : fetch(input, init);
    await expect(createApi({ base: API_URL, fetch: busy, store }).request('/me')).rejects.toMatchObject({ status: 503 });
    expect(store.saved).not.toBeNull();
    expect(await cookieRenews(sessionCookie())).toBe(true);
  });

  it('reports a server it cannot reach as status 0', async () => {
    const api = createApi({ base: 'http://localhost:9/v1', fetch: (...a) => fetch(...a), store: memoryStore() });
    const err = await api.request('/health').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 0 });
  });

  it('signs out: forgets the session, drops the cookie and ends it on the server', async () => {
    await insertUser('admin', '01000000001');
    const store = memoryStore();
    const api = client(store);
    await api.signIn('01000000001', PASSWORD);
    const cookie = sessionCookie();
    await api.signOut();
    expect(store.saved).toBeNull();
    expect(sessionCookie()).toBeUndefined();
    expect(await cookieRenews(cookie)).toBe(false);
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

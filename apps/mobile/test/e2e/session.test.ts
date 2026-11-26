import * as SecureStore from 'expo-secure-store';
import { api } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { queryClient } from '@/core/query';
import { cartApi } from '@/features/cart/api/cart';
import { insertCategory, insertMenuItem, insertStore } from '../utils/catalog';
import { insertUser, pastRefreshGrace, refreshWorks, resetDb, signInAs } from '../utils/db';

beforeEach(async () => {
  await session.signOutLocally();
  await resetDb();
});

describe('session (real API)', () => {
  it('keeps the tokens in secure storage after sign-in', async () => {
    await insertUser('driver', '01000000003');
    const auth = await signInAs('01000000003');
    await session.signIn(auth);
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { role: 'driver' } });
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBe(auth.refreshToken);
    expect(session.accessToken()).toBe(auth.accessToken);
  });

  it('forgets everything on sign-out', async () => {
    await insertUser('customer', '01554459196');
    await session.signIn(await signInAs('01554459196'));
    await session.signOutLocally();
    expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBeNull();
    expect(session.accessToken()).toBeNull();
  });

  it('opens signed-in on the next launch with the stored refresh token, and rotates it', async () => {
    await insertUser('partner', '01000000002');
    const auth = await signInAs('01000000002');
    await SecureStore.setItemAsync('tawsela.refreshToken', auth.refreshToken);
    await session.restore();
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { role: 'partner' } });
    const stored = await SecureStore.getItemAsync('tawsela.refreshToken');
    expect(stored).toEqual(expect.stringMatching(/.+/));
    expect(stored).not.toBe(auth.refreshToken);
    await pastRefreshGrace();
    expect(await refreshWorks(auth.refreshToken)).toBe(false);
  });

  it('a launch-time restore that ends after a sign-in leaves the new account signed in', async () => {
    await insertUser('driver', '01000000003');
    const auth = await signInAs('01000000003');
    await SecureStore.setItemAsync('tawsela.refreshToken', 'refused-token');
    const restoring = session.restore(); // still reading storage
    await session.signIn(auth);
    await restoring;
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { role: 'driver' } });
  });

  it('a sign-in that ends after sign-out does not sign the old account back in', async () => {
    await insertUser('customer', '01554459196');
    const auth = await signInAs('01554459196');
    const late = session.signIn(auth); // still writing the token to storage
    await session.signOutLocally();
    await late;
    expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(session.accessToken()).toBeNull();
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBeNull();
  });

  it('opens signed-out when there is no stored session', async () => {
    await session.restore();
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('opens signed-out and forgets the token when the server refuses it', async () => {
    await SecureStore.setItemAsync('tawsela.refreshToken', 'old');
    await session.restore();
    expect(useSession.getState().status).toBe('signedOut');
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBeNull();
  });

  it('opens offline without the server, keeps the stored session, and opens it on retry', async () => {
    await insertUser('customer', '01554459196');
    const auth = await signInAs('01554459196');
    await SecureStore.setItemAsync('tawsela.refreshToken', auth.refreshToken);
    const url = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:9/v1';
    try {
      await session.restore();
    } finally {
      process.env.EXPO_PUBLIC_API_URL = url;
    }
    expect(useSession.getState().status).toBe('offline');
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBe(auth.refreshToken);
    await session.restore();
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { phone: '01554459196' } });
  });

  it('opens signed-out, not stuck on the splash, when secure storage cannot be read', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore'));
    await session.restore();
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('drops answers that arrive after sign-out: a refresh, a profile save, a retried call', async () => {
    await insertUser('customer', '01554459196');
    await insertUser('customer', '01000000001');
    const a = await signInAs('01554459196');
    await session.signIn(a);
    const refreshing = session.refresh();
    await session.signOutLocally();
    await refreshing;
    expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(session.accessToken()).toBeNull();

    session.setUser(a.user);
    expect(useSession.getState().user).toBeNull();

    // A call made by A that comes back 401 after B signed in is not resent with B's token.
    const b = await signInAs('01000000001');
    await session.signIn({ ...a, accessToken: 'expired' });
    const call = api('/me');
    await session.signIn(b);
    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().user?.phone).toBe('01000000001');
  });

  it("keeps each account's server cart across sign-out without showing it to another account (review F30)", async () => {
    await insertUser('customer', '01554459196');
    await insertUser('customer', '01100000001');
    const store = await insertStore('الساقية');
    const productId = await insertMenuItem(store, await insertCategory(store, 'الوجبات'), 'شاورما', 50);
    await session.signIn(await signInAs('01554459196'));
    await cartApi.add({ productId, optionIds: [], removedIngredientIds: [], quantity: 2 });
    await session.signOut();
    await session.signIn(await signInAs('01100000001'));
    expect((await cartApi.get(store)).cart).toBeNull();
    const first = await signInAs('01554459196');
    const switching = session.signIn(first);
    const duringSwitch = session.generation();
    const readBeforeSwitch = cartApi.get(store);
    await switching;
    expect(session.generation()).not.toBe(duringSwitch);
    expect((await readBeforeSwitch).cart).toBeNull();
    expect((await cartApi.get(store)).cart).toMatchObject({ count: 2, total: 100 });
  });

  it('signs out on the phone first, then tells the server (review F10)', async () => {
    await insertUser('customer', '01554459196');
    const auth = await signInAs('01554459196');
    await session.signIn(auth);
    const real = global.fetch;
    let statusWhenSent: string | undefined;
    const spy = jest.spyOn(global, 'fetch').mockImplementation((input, init) => {
      if (String(input).endsWith('/auth/logout')) statusWhenSent = useSession.getState().status;
      return real(input, init);
    });
    try {
      await session.signOut();
    } finally {
      spy.mockRestore();
    }
    expect(statusWhenSent).toBe('signedOut');
    expect(await refreshWorks(auth.refreshToken)).toBe(false);
  });

  it("empties the data cache on sign-in and sign-out, so no account sees another's", async () => {
    await insertUser('customer', '01554459196');
    queryClient.setQueryData(['favorites'], [{ id: 1 }]);
    await session.signIn(await signInAs('01554459196'));
    expect(queryClient.getQueryData(['favorites'])).toBeUndefined();
    queryClient.setQueryData(['favorites'], [{ id: 2 }]);
    await session.signOutLocally();
    expect(queryClient.getQueryData(['favorites'])).toBeUndefined();
  });

  it("drops the old account's answers cached while the new sign-in was still being saved", async () => {
    await insertUser('customer', '01554459196');
    await insertUser('customer', '01100000001');
    await session.signIn(await signInAs('01554459196'));
    const b = await signInAs('01100000001');
    let saved: () => void = () => undefined;
    jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(() => new Promise((resolve) => (saved = () => resolve())));
    const switching = session.signIn(b); // still writing B's token to storage
    // A screen still showing A asks for A's data, with A's token, and caches it.
    await queryClient.fetchQuery({ queryKey: ['me'], queryFn: () => api<{ phone: string }>('/me') });
    expect(queryClient.getQueryData<{ phone: string }>(['me'])?.phone).toBe('01554459196');
    saved();
    await switching;
    expect(useSession.getState().user?.phone).toBe('01100000001');
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });
});

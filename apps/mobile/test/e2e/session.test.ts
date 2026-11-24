import * as SecureStore from 'expo-secure-store';
import { api } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { queryClient } from '@/core/query';
import { insertUser, refreshWorks, resetDb, signInAs } from '../utils/db';

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

  it("empties the data cache on sign-in and sign-out, so no account sees another's", async () => {
    await insertUser('customer', '01554459196');
    queryClient.setQueryData(['favorites'], [{ id: 1 }]);
    await session.signIn(await signInAs('01554459196'));
    expect(queryClient.getQueryData(['favorites'])).toBeUndefined();
    queryClient.setQueryData(['favorites'], [{ id: 2 }]);
    await session.signOutLocally();
    expect(queryClient.getQueryData(['favorites'])).toBeUndefined();
  });
});

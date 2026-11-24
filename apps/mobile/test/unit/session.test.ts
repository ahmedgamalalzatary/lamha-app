import * as SecureStore from 'expo-secure-store';
import { session, useSession } from '@/core/auth/session';
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
    expect(stored).not.toBe(auth.refreshToken);
    expect(await refreshWorks(auth.refreshToken)).toBe(false);
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
});

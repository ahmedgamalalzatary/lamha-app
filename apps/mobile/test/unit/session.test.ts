import * as SecureStore from 'expo-secure-store';
import { session, useSession } from '@/core/auth/session';
import { auth, mockApi } from '../utils/api-mock';

beforeEach(async () => {
  await session.signOutLocally();
});

describe('session', () => {
  it('keeps the tokens in secure storage after sign-in', async () => {
    await session.signIn(auth('driver'));
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { role: 'driver' } });
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBe('refresh-driver');
    expect(session.accessToken()).toBe('access-driver');
  });

  it('forgets everything on sign-out', async () => {
    await session.signIn(auth());
    await session.signOutLocally();
    expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBeNull();
    expect(session.accessToken()).toBeNull();
  });

  it('opens signed-in on the next launch with the stored refresh token', async () => {
    await SecureStore.setItemAsync('tawsela.refreshToken', 'stored');
    const api = mockApi({ 'POST /auth/refresh': [201, auth('partner')] });
    await session.restore();
    expect(api.calls[0]?.body).toEqual({ refreshToken: 'stored' });
    expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { role: 'partner' } });
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBe('refresh-partner');
  });

  it('opens signed-out when there is no stored session', async () => {
    await session.restore();
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('opens signed-out and forgets the token when the server refuses it', async () => {
    await SecureStore.setItemAsync('tawsela.refreshToken', 'old');
    mockApi({ 'POST /auth/refresh': [401, { statusCode: 401, code: 'SESSION_EXPIRED', message: 'x' }] });
    await session.restore();
    expect(useSession.getState().status).toBe('signedOut');
    expect(await SecureStore.getItemAsync('tawsela.refreshToken')).toBeNull();
  });
});

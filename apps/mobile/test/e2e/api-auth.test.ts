import type { Me } from '@tawsela/shared';
import { api } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { insertUser, pastRefreshGrace, refreshWorks, resetDb, signInAs } from '../utils/db';

beforeEach(async () => {
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196', { firstName: 'احمد' });
});

describe('api with a session (real API)', () => {
  it('sends the access token', async () => {
    await session.signIn(await signInAs('01554459196'));
    await expect(api<Me>('/me')).resolves.toMatchObject({ phone: '01554459196', firstName: 'احمد' });
  });

  it('refreshes an expired access token once and retries', async () => {
    const auth = await signInAs('01554459196');
    // An access token the API no longer accepts, as after 15 minutes.
    await session.signIn({ ...auth, accessToken: `${auth.accessToken}x` });
    await expect(api<Me>('/me')).resolves.toMatchObject({ phone: '01554459196' });
    expect(session.accessToken()).not.toBe(`${auth.accessToken}x`);
    // The old refresh token was rotated away.
    await pastRefreshGrace();
    expect(await refreshWorks(auth.refreshToken)).toBe(false);
  });

  it('signs out when the refresh is refused', async () => {
    const auth = await signInAs('01554459196');
    await session.signIn({ ...auth, accessToken: `${auth.accessToken}x`, refreshToken: 'not-a-token' });
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('never refreshes for the sign-in routes themselves', async () => {
    await expect(api('/auth/login', { method: 'POST', body: { phone: '01554459196', password: 'wrongpass' }, auth: false })).rejects.toMatchObject({
      code: 'BAD_CREDENTIALS',
    });
    expect(useSession.getState().status).toBe('signedOut');
  });
});

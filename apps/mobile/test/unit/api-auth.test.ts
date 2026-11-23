import { api } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { auth, me, mockApi } from '../utils/api-mock';

beforeEach(async () => {
  await session.signOutLocally();
});

describe('api with a session', () => {
  it('sends the access token', async () => {
    await session.signIn(auth());
    const mock = mockApi({ 'GET /me': [200, me()] });
    await api('/me');
    expect(mock.calls[0]?.headers.Authorization).toBe('Bearer access-customer');
  });

  it('refreshes an expired access token once and retries', async () => {
    await session.signIn(auth());
    let first = true;
    const mock = mockApi({
      'GET /me': () => {
        if (first) {
          first = false;
          return [401, { statusCode: 401, message: 'Unauthorized' }];
        }
        return [200, me({ firstName: 'بعد' })];
      },
      'POST /auth/refresh': [201, { ...auth(), accessToken: 'access-new', refreshToken: 'refresh-new' }],
    });
    await expect(api('/me')).resolves.toMatchObject({ firstName: 'بعد' });
    expect(mock.calls.map((c) => c.route)).toEqual(['GET /me', 'POST /auth/refresh', 'GET /me']);
    expect(mock.calls[2]?.headers.Authorization).toBe('Bearer access-new');
  });

  it('signs out when the refresh is refused', async () => {
    await session.signIn(auth());
    mockApi({
      'GET /me': [401, { statusCode: 401, message: 'Unauthorized' }],
      'POST /auth/refresh': [401, { statusCode: 401, code: 'SESSION_EXPIRED', message: 'x' }],
    });
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('never refreshes for the sign-in routes themselves', async () => {
    const mock = mockApi({ 'POST /auth/login': [401, { statusCode: 401, code: 'BAD_CREDENTIALS', message: 'x' }] });
    await expect(api('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ code: 'BAD_CREDENTIALS' });
    expect(mock.calls).toHaveLength(1);
  });
});

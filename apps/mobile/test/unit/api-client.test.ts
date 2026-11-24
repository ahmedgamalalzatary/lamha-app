import type { HealthResponse } from '@tawsela/shared';
import { api, ApiRequestError } from '@/core/api/client';
import { emailedCode, insertUser, resetDb } from '../utils/db';

beforeEach(async () => {
  await resetDb();
});

describe('api (real API)', () => {
  it('calls the API URL from the env and returns the JSON', async () => {
    await expect(api<HealthResponse>('/health', { auth: false })).resolves.toMatchObject({ status: 'ok', db: 'up' });
  });

  it('sends a JSON body and turns an error response into an ApiRequestError with its code', async () => {
    await insertUser('customer', '01554459196');
    const err = await api('/auth/login', { method: 'POST', body: { phone: '01554459196', password: 'wrongpass' }, auth: false }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 401, code: 'BAD_CREDENTIALS' });
  });

  it('uses the first validation message', async () => {
    await expect(api('/auth/login', { method: 'POST', body: { phone: '0123', password: 'x' }, auth: false })).rejects.toMatchObject({
      status: 400,
      message: 'phone must be an Egyptian mobile number',
    });
  });

  it('passes on the error code and its numbers (tries left)', async () => {
    await api('/auth/signup/code', { method: 'POST', body: { phone: '01554459196', email: 'a@b.co' }, auth: false });
    const wrong = (await emailedCode('01554459196', 'signup')) === '0000' ? '1111' : '0000';
    await expect(
      api('/auth/code/verify', { method: 'POST', body: { phone: '01554459196', purpose: 'signup', code: wrong }, auth: false }),
    ).rejects.toMatchObject({ status: 400, code: 'OTP_WRONG', triesLeft: 4 });
  });

  it('reports a server it cannot reach as status 0', async () => {
    const url = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:9/v1';
    try {
      await expect(api('/health', { auth: false })).rejects.toMatchObject({ status: 0 });
    } finally {
      process.env.EXPO_PUBLIC_API_URL = url;
    }
  });
});

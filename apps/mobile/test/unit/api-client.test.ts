import { api, ApiRequestError } from '@/core/api/client';

const realFetch = global.fetch;

function respond(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = realFetch;
});

describe('api', () => {
  it('calls the API URL from the root .env and returns the JSON', async () => {
    respond(200, { status: 'ok' });
    await expect(api('/health')).resolves.toEqual({ status: 'ok' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.EXPO_PUBLIC_API_URL}/health`,
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('sends a JSON body', async () => {
    respond(201, {});
    await api('/things', { method: 'POST', body: { a: 1 } });
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('turns an error response into an ApiRequestError with the API message', async () => {
    respond(404, { statusCode: 404, message: 'Cannot GET /v1/nope', error: 'Not Found' });
    const err = await api('/nope').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 404, message: 'Cannot GET /v1/nope' });
  });

  it('uses the first validation message', async () => {
    respond(400, { statusCode: 400, message: ['phone is wrong', 'email is wrong'], error: 'Bad Request' });
    await expect(api('/x')).rejects.toMatchObject({ status: 400, message: 'phone is wrong' });
  });

  it('passes on the error code and its numbers', async () => {
    respond(400, { statusCode: 400, code: 'OTP_WRONG', message: 'Wrong code', triesLeft: 3 });
    await expect(api('/auth/code/verify', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      code: 'OTP_WRONG',
      triesLeft: 3,
    });
  });

  it('reports a network failure as status 0', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(api('/health')).rejects.toMatchObject({ status: 0 });
  });
});

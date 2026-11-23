import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError } from '@/core/api/client';

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('calls NEXT_PUBLIC_API_URL and returns the JSON', async () => {
    respond(200, { status: 'ok' });
    await expect(api('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('http://localhost:4001/v1/health', expect.objectContaining({ method: 'GET' }));
  });

  it('throws the API message on an error response', async () => {
    respond(503, { statusCode: 503, message: 'Service Unavailable' });
    await expect(api('/health')).rejects.toMatchObject({ status: 503, message: 'Service Unavailable' });
  });

  it('uses the first validation message', async () => {
    respond(400, { statusCode: 400, message: ['name is required', 'phone is wrong'] });
    await expect(api('/x')).rejects.toMatchObject({ status: 400, message: 'name is required' });
  });

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const err = await api('/health').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 0 });
  });
});

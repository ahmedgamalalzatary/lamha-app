import type { AuthResponse, Me, Role } from '@tawsela/shared';

type Reply = [status: number, body?: unknown];
type Handler = Reply | ((body: unknown) => Reply);

/**
 * Stands in for the API: `mockApi({ 'POST /auth/login': [201, auth()] })`. Every call is recorded
 * in `calls`; a route without a handler fails the test loudly.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { route: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetchMock = jest.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace(process.env.EXPO_PUBLIC_API_URL!, '');
    const route = `${init.method ?? 'GET'} ${path}`;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ route, body, headers: (init.headers ?? {}) as Record<string, string> });
    const handler = routes[route];
    if (!handler) throw new Error(`No mock for ${route}`);
    const [status, payload] = typeof handler === 'function' ? handler(body) : handler;
    return { ok: status >= 200 && status < 300, status, json: async () => payload } as Response;
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { calls, fetchMock };
}

export function me(over: Partial<Me> = {}): Me {
  return {
    id: 1,
    role: 'customer',
    phone: '01554459196',
    email: 'ahmed@gmail.com',
    firstName: 'احمد',
    lastName: 'الزعتري',
    gender: null,
    region: null,
    locale: 'ar',
    inviteCode: '3JXDEB',
    ...over,
  };
}

export function auth(role: Role = 'customer', over: Partial<Me> = {}): AuthResponse {
  return { user: me({ role, ...over }), accessToken: `access-${role}`, refreshToken: `refresh-${role}`, expiresIn: 900 };
}

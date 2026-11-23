import type { ApiError } from '@tawsela/shared';

/** An API call that failed. `status` is 0 when the server could not be reached. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** EXPO_PUBLIC_API_URL from the root .env (e.g. http://192.168.1.5:4000/v1 for a phone on the same Wi-Fi). */
const baseUrl = () => process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/** Calls the API and returns its JSON, or throws ApiRequestError with the API's message. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (e) {
    throw new ApiRequestError(0, e instanceof Error ? e.message : 'Network request failed');
  }

  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = (data as ApiError | undefined)?.message;
    throw new ApiRequestError(res.status, (Array.isArray(message) ? message[0] : message) ?? `HTTP ${res.status}`);
  }
  return data as T;
}

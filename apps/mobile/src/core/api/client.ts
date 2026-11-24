import type { ApiError, ApiErrorCode } from '@tawsela/shared';
import { session } from '../auth/session';

/** An API call that failed. `status` is 0 when the server could not be reached. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: ApiErrorCode,
    readonly retryIn?: number,
    readonly triesLeft?: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** false for the sign-in routes: no token is sent and a 401 is not retried. */
  auth?: boolean;
}

/** EXPO_PUBLIC_API_URL from the root .env (e.g. http://192.168.1.5:4000/v1 for a phone on the same Wi-Fi). */
const baseUrl = () => process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/** Where an uploaded image is served: the API's host, next to /v1 (e.g. /uploads/catalog/x.jpg). */
export const mediaUrl = (path: string | null): string | null => (path ? new URL(path, baseUrl()).href : null);

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.auth === false ? null : session.accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (e) {
    throw new ApiRequestError(0, e instanceof Error ? e.message : 'Network request failed');
  }
}

/**
 * Calls the API and returns its JSON, or throws ApiRequestError with the API's message and code.
 * An expired access token is refreshed once and the call retried; if that fails, the app signs out.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);
  if (res.status === 401 && options.auth !== false && session.accessToken()) {
    if (await session.refresh()) res = await send(path, options);
  }

  const data = (await res.json().catch(() => undefined)) as (ApiError & { code?: ApiErrorCode }) | undefined;
  if (!res.ok) {
    const message = data?.message;
    throw new ApiRequestError(
      res.status,
      (Array.isArray(message) ? message[0] : message) ?? `HTTP ${res.status}`,
      data?.code,
      data?.retryIn,
      data?.triesLeft,
    );
  }
  return data as T;
}

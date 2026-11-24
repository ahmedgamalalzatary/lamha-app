import { AUTH } from '@tawsela/shared';
import type { Request, Response } from 'express';

/**
 * The dashboard's refresh token lives in this cookie, never where page scripts can read it (review
 * F11). HttpOnly: scripts cannot read it. SameSite=Strict and only on /v1/auth: other sites' pages
 * never send it. The dashboard asks for this mode with the `X-Session: cookie` header, which another
 * site cannot add without the API's CORS consent, so a renewal can only come from the dashboard.
 * The phone app keeps its token in secure storage and sends it in the body, as before.
 */
export const REFRESH_COOKIE = 'tawsela_rt';
const PATH = '/v1/auth';

/** Whether the caller is the dashboard, asking for the cookie. */
export const wantsCookie = (req: Request) => req.headers['x-session'] === 'cookie';

/** The refresh token in the cookie, if any. */
export function readRefreshCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(value.join('=')) || undefined;
  }
  return undefined;
}

export function setRefreshCookie(res: Response, token: string, secure: boolean): void {
  res.cookie(REFRESH_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure, path: PATH, maxAge: AUTH.refreshTokenDays * 86_400_000 });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', secure, path: PATH });
}

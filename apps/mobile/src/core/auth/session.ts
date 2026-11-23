import type { AuthResponse, Me } from '@tawsela/shared';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api, ApiRequestError } from '../api/client';

/** loading: reading the stored session at launch. */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export const useSession = create<{ status: SessionStatus; user: Me | null }>(() => ({ status: 'loading', user: null }));

/** Only the refresh token is stored (secure storage); the short access token lives in memory. */
const REFRESH_KEY = 'tawsela.refreshToken';
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const session = {
  accessToken: () => accessToken,

  async signIn(res: AuthResponse): Promise<void> {
    accessToken = res.accessToken;
    await SecureStore.setItemAsync(REFRESH_KEY, res.refreshToken);
    useSession.setState({ status: 'signedIn', user: res.user });
  },

  setUser(user: Me): void {
    useSession.setState({ user });
  },

  /**
   * A new access token from the stored refresh token. Calls made at the same time share one
   * refresh. A refused token signs out; a network failure keeps the session for the next try.
   */
  refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) {
        await session.signOutLocally();
        return false;
      }
      try {
        await session.signIn(await api<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }));
        return true;
      } catch (e) {
        if (e instanceof ApiRequestError && e.status !== 0) await session.signOutLocally();
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  },

  /** At launch: signed in again with the stored token, or signed out. */
  async restore(): Promise<void> {
    if (!(await session.refresh())) useSession.setState({ status: 'signedOut', user: null });
  },

  /** "تسجيل الخروج": the server forgets this device's token, then the app forgets everything. */
  async signOut(): Promise<void> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refreshToken) {
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
    }
    await session.signOutLocally();
  },

  async signOutLocally(): Promise<void> {
    accessToken = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    useSession.setState({ status: 'signedOut', user: null });
  },
};

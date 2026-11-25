import type { AuthResponse, Me } from '@tawsela/shared';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api, ApiRequestError } from '../api/client';
import { devicePushToken, registrationSettled } from '../push/device-token';
import { queryClient } from '../query';
import { localePreference } from '../i18n/locale';

/**
 * loading: reading the stored session at launch. offline: a session is stored but the server could
 * not be reached at launch; the app offers a retry instead of the sign-in screen.
 */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut' | 'offline';

export const useSession = create<{ status: SessionStatus; user: Me | null }>(() => ({ status: 'loading', user: null }));

/** Only the refresh token is stored (secure storage); the short access token lives in memory. */
const REFRESH_KEY = 'tawsela.refreshToken';
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
/**
 * Moves on at every sign-in and sign-out. An answer to a call made under an older generation
 * (a refresh, a profile save, a 401 retry) arrives too late and is dropped.
 */
let generation = 0;
let pendingSignIn: number | null = null;
/** Why the last refresh failed: the server refused the token, or it could not be reached. */
let lastRefusal: 'refused' | 'unreachable' = 'refused';

/** The server refused the refresh token itself; anything else (offline, 429, 5xx) keeps it. */
const refused = (e: unknown) => e instanceof ApiRequestError && (e.status === 401 || e.status === 403);

/** A stored refresh token, or null; storage that cannot be read counts as none. */
const storedToken = () => SecureStore.getItemAsync(REFRESH_KEY).catch(() => null);

/** The refresh token of the current generation (null when signed out), to undo a late storage write. */
let currentRefresh: string | null = null;

/**
 * The tokens of the session that generation `gen` started. If a sign-in or sign-out moved the
 * generation on meanwhile, nothing is kept, and a storage write that landed late is put back.
 */
async function keep(res: AuthResponse, gen: number, newSession = false): Promise<number | undefined> {
  if (gen !== generation) return;
  currentRefresh = res.refreshToken;
  await SecureStore.setItemAsync(REFRESH_KEY, res.refreshToken);
  if (gen !== generation) {
    await (currentRefresh ? SecureStore.setItemAsync(REFRESH_KEY, currentRefresh) : SecureStore.deleteItemAsync(REFRESH_KEY)).catch(() => undefined);
    return;
  }
  // Publish the request credentials together with the account that owns them.
  // Requests started while SecureStore was writing belonged to the previous account.
  // Their answers may already be cached, so the cache is emptied again here.
  if (newSession) {
    generation++;
    queryClient.clear();
  }
  accessToken = res.accessToken;
  useSession.setState({ status: 'signedIn', user: res.user });
  return generation;
}

export const session = {
  accessToken: () => accessToken,
  generation: () => generation,

  /** A new session: the previous account's cached data goes with it. */
  async signIn(res: AuthResponse): Promise<void> {
    const gen = ++generation;
    pendingSignIn = gen;
    currentRefresh = null;
    queryClient.clear();
    try {
      const active = await keep(res, gen, true);
      if (active === generation && localePreference.current() !== res.user.locale) {
        await localePreference.restore(res.user.locale, () => active === generation);
      }
    } finally {
      if (pendingSignIn === gen) pendingSignIn = null;
    }
  },

  /** A fresh copy of the signed-in account; ignored once that account is no longer signed in. */
  setUser(user: Me): void {
    if (useSession.getState().user?.id === user.id) useSession.setState({ user });
  },

  /**
   * A new access token from the stored refresh token. Calls made at the same time share one
   * refresh. Only a refused token signs out; offline or a busy server keeps the session.
   */
  refresh(): Promise<boolean> {
    if (pendingSignIn === generation) return Promise.resolve(false);
    refreshing ??= (async () => {
      const gen = generation;
      const refreshToken = await storedToken();
      if (gen !== generation) return false;
      if (!refreshToken) {
        lastRefusal = 'refused';
        await session.signOutLocally();
        return false;
      }
      try {
        const res = await api<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
        if (gen !== generation) return false;
        await keep(res, gen);
        return gen === generation;
      } catch (e) {
        if (gen !== generation) return false;
        lastRefusal = refused(e) ? 'refused' : 'unreachable';
        if (lastRefusal === 'refused') await session.signOutLocally();
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  },

  /** At launch (and on retry): signed in again with the stored token, offline, or signed out. */
  async restore(): Promise<void> {
    const gen = generation;
    if (pendingSignIn === gen) return;
    if (await session.refresh()) return;
    // A sign-in or sign-out meanwhile has already decided the state.
    if (gen !== generation) return;
    useSession.setState({ status: lastRefusal === 'unreachable' ? 'offline' : 'signedOut', user: null });
  },

  /**
   * "تسجيل الخروج": the app forgets everything at once, then tells the server to forget this
   * device's token (review F10): a slow or unreachable server never holds the customer on the screen.
   */
  async signOut(): Promise<void> {
    // A push registration on its way lands first; then the sign-out takes this phone's token back
    // with the session, so the next account on this phone gets none of this one's pushes (§8.14).
    await registrationSettled();
    const pushToken = (await devicePushToken()) ?? undefined;
    const refreshToken = await storedToken();
    await session.signOutLocally();
    if (refreshToken) {
      await api('/auth/logout', { method: 'POST', body: { refreshToken, pushToken }, auth: false }).catch(() => undefined);
    }
  },

  async signOutLocally(): Promise<void> {
    generation++;
    pendingSignIn = null;
    accessToken = null;
    currentRefresh = null;
    queryClient.clear();
    useSession.setState({ status: 'signedOut', user: null });
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  },
};

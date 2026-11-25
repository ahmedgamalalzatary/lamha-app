import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tawsela.pushToken';

/** A registration still on its way: signing out waits for it, or it could land after the sign-out. */
let inflight: Promise<unknown> | null = null;

/** This phone's Expo token once the API has it, kept on the phone so a restart still knows it. */
export async function rememberPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token).catch(() => undefined);
}

/**
 * The token signing out takes back (sent with /auth/logout, contract §8.14). The API removes it only
 * from the account signing out, so a token another account registered since is never touched.
 */
export function devicePushToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY).catch(() => null);
}

export function trackRegistration<T>(registration: Promise<T>): Promise<T> {
  const tracked = registration.finally(() => {
    if (inflight === tracked) inflight = null;
  });
  inflight = tracked;
  return tracked;
}

/** Waits (a few seconds at most) for a registration on its way before signing out. */
export async function registrationSettled(): Promise<void> {
  if (!inflight) return;
  await Promise.race([inflight.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 3_000))]);
}

import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { session, useSession } from '@/core/auth/session';
import { notificationsApi, notificationsKey } from './api';

/** This phone's token, once sent: signing out takes it back so the next account gets no pushes of ours. */
let sentToken: string | null = null;

// A push that arrives while the app is open still shows on top.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function phoneToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: AndroidImportance.HIGH });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

/** Signing out on this phone: no more pushes to it (best effort; the token is dropped by Expo's answer otherwise). */
export async function forgetPushToken(): Promise<void> {
  const token = sentToken;
  sentToken = null;
  if (token) await notificationsApi.remove(token).catch(() => undefined);
}

function open(path: unknown) {
  if (typeof path === 'string' && path.startsWith('/')) router.push(path as never);
}

/**
 * Push for every signed-in account (contract §8.14, §9, §10): asks once for permission, sends the
 * phone's Expo token to the API, and opens what a tapped push points at. A push also refreshes
 * الإشعارات. Without a token (permission refused, no Expo project yet [Open]) the app works as before.
 */
export function PushSetup() {
  const queries = useQueryClient();
  const userId = useSession((s) => s.user?.id);

  useEffect(() => {
    if (userId === undefined) return;
    const generation = session.generation();
    phoneToken()
      .then(async (token) => {
        if (!token || session.generation() !== generation) return;
        await notificationsApi.register(token);
        sentToken = token;
      })
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    const tapped = Notifications.addNotificationResponseReceivedListener((r) => {
      void queries.invalidateQueries({ queryKey: notificationsKey });
      open(r.notification.request.content.data?.path);
    });
    // The push that opened the app from closed.
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => r && open(r.notification.request.content.data?.path))
      .catch(() => undefined);
    return () => tapped.remove();
  }, [queries]);

  return null;
}

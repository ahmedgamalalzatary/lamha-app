import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { session, useSession } from '@/core/auth/session';
import { rememberPushToken, trackRegistration } from '@/core/push/device-token';
import { notificationsApi, notificationsKey } from '../api/notifications';

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
    // Tracked, so signing out waits for it; the token is kept on the phone for that sign-out.
    void trackRegistration(
      phoneToken().then(async (token) => {
        if (!token || session.generation() !== generation) return;
        await notificationsApi.register(token);
        await rememberPushToken(token);
      }),
    ).catch(() => undefined);
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

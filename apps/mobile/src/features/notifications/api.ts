import type { NotificationsPage } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

export const notificationsKey = ['notifications'] as const;

export const notificationsApi = {
  register: (token: string) => api<void>('/me/push-tokens', { method: 'POST', body: { token } }),
  remove: (token: string) => api<void>('/me/push-tokens', { method: 'DELETE', body: { token } }),
  list: () => api<NotificationsPage>('/me/notifications?limit=50'),
  read: () => api<void>('/me/notifications/read', { method: 'POST' }),
};

/** الإشعارات, newest first, with the unread count (the dot on حسابي's bell). */
export function useNotifications() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({ queryKey: [...notificationsKey, userId], queryFn: notificationsApi.list, enabled: userId !== undefined });
}

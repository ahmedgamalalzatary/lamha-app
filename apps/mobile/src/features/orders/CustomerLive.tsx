import { useQueryClient } from '@tanstack/react-query';
import { ORDER_SOCKET_EVENTS } from '@tawsela/shared';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { api, apiOrigin } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { ordersKey } from './api';

/**
 * The customer's orders, live (contract §8.8, §12 S3): a change of status or captain refreshes طلباتي
 * and the open order. Only the status: live tracking is out of scope (§15.2). The socket sends the
 * current access token on every (re)connect; when the server drops it (an expired token), one API
 * call renews the token and the socket connects again.
 */
export function useCustomerLive(): void {
  const queries = useQueryClient();
  const customerId = useSession((s) => (s.user?.role === 'customer' ? s.user.id : undefined));

  useEffect(() => {
    if (customerId === undefined) return;
    const socket = io(apiOrigin(), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: session.accessToken() ?? '' }),
    });
    const refresh = () => void queries.invalidateQueries({ queryKey: ordersKey });
    let retry: ReturnType<typeof setTimeout> | undefined;
    // Anything that changed while it was away.
    socket.on('ready', refresh);
    socket.on(ORDER_SOCKET_EVENTS.status, refresh);
    socket.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return;
      retry = setTimeout(() => {
        api('/me/orders')
          .then(() => socket.connect())
          .catch(() => undefined);
      }, 5_000);
    });
    return () => {
      clearTimeout(retry);
      socket.disconnect();
    };
  }, [customerId, queries]);
}

export function CustomerLive() {
  useCustomerLive();
  return null;
}

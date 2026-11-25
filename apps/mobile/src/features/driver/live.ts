import { useQueryClient } from '@tanstack/react-query';
import { DRIVER_SOCKET_EVENTS } from '@tawsela/shared';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { create } from 'zustand';
import { api, apiOrigin } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { driverKey } from './api';

/** Whether the delivery man's live connection is up. */
export const useDriverConnected = create<boolean>(() => false);

/**
 * The delivery man's live offers (contract §10, §12 S3), while one is signed in: a new offer, an
 * offer gone or a change to one of his orders refreshes the lists; the screens ring from them. The
 * socket sends the current access token on every (re)connect; when the server drops it (an expired
 * token), one API call renews the token and the socket connects again.
 */
export function useDriverLive(): void {
  const queries = useQueryClient();
  const driverId = useSession((s) => (s.user?.role === 'driver' ? s.user.id : undefined));

  useEffect(() => {
    if (driverId === undefined) return;
    const socket = io(apiOrigin(), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: session.accessToken() ?? '' }),
    });
    const refresh = () => void queries.invalidateQueries({ queryKey: driverKey });
    let retry: ReturnType<typeof setTimeout> | undefined;
    socket.on('ready', () => {
      useDriverConnected.setState(true, true);
      refresh();
    });
    socket.on(DRIVER_SOCKET_EVENTS.offer, refresh);
    socket.on(DRIVER_SOCKET_EVENTS.offerGone, refresh);
    socket.on(DRIVER_SOCKET_EVENTS.order, refresh);
    socket.on('disconnect', (reason) => {
      useDriverConnected.setState(false, true);
      if (reason !== 'io server disconnect') return;
      retry = setTimeout(() => {
        api('/driver/shift')
          .then(() => socket.connect())
          .catch(() => undefined);
      }, 5_000);
    });
    return () => {
      clearTimeout(retry);
      socket.disconnect();
      useDriverConnected.setState(false, true);
    };
  }, [driverId, queries]);
}

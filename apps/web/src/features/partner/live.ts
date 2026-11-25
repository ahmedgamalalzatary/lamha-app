'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ORDER_SOCKET_EVENTS } from '@tawsela/shared';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, apiOrigin } from '@/core/api/client';
import { partnerOrdersKey } from './api';

/**
 * The store's live orders (contract §12 S3): while a /partner page is open, a new order or a status
 * change refreshes the store's order lists at once. The socket sends the current access token on
 * every (re)connect; when the server drops it (an expired token), one API call renews the token and
 * the socket connects again. Returns whether it is connected now.
 */
export function usePartnerLive(): boolean {
  const queries = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(apiOrigin, {
      transports: ['websocket'],
      auth: (cb) => cb({ token: api.session()?.accessToken ?? '' }),
    });
    const refresh = () => void queries.invalidateQueries({ queryKey: partnerOrdersKey });
    let retry: ReturnType<typeof setTimeout> | undefined;
    socket.on('ready', () => {
      setConnected(true);
      // Anything that came while it was away.
      refresh();
    });
    socket.on(ORDER_SOCKET_EVENTS.placed, refresh);
    socket.on(ORDER_SOCKET_EVENTS.status, refresh);
    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason !== 'io server disconnect') return;
      // Refused: renew the token through a normal call, then try again.
      retry = setTimeout(() => {
        void api
          .request('/partner/orders/counts')
          .then(() => socket.connect())
          .catch(() => undefined);
      }, 5_000);
    });
    return () => {
      clearTimeout(retry);
      socket.disconnect();
    };
  }, [queries]);

  return connected;
}

import { useQueryClient } from '@tanstack/react-query';
import { ORDER_SOCKET_EVENTS } from '@tawsela/shared';
import { useEffect } from 'react';
import { Vibration } from 'react-native';
import { io } from 'socket.io-client';
import { create } from 'zustand';
import { api, apiOrigin } from '@/core/api/client';
import { session, useSession } from '@/core/auth/session';
import { renewAndReconnect } from '@/core/api/live-reconnect';
import { partnerOrdersKey } from './api';

/** Whether the store's live connection is up (shown on الرئيسية). */
export const useLiveConnected = create<boolean>(() => false);

/** A ring for a new order: vibration only for now; the sound comes with notifications (Phase 16). */
const RING = [0, 500, 250, 500];

/**
 * The store's live orders (contract §12 S3), while a partner is signed in: a new order rings the
 * phone and refreshes the lists (the popup shows from them); a status change refreshes them. The
 * socket sends the current access token on every (re)connect; when the server drops it (an expired
 * token), one API call renews the token and the socket connects again.
 */
export function usePartnerLive(): void {
  const queries = useQueryClient();
  const partnerId = useSession((s) => (s.user?.role === 'partner' ? s.user.id : undefined));

  useEffect(() => {
    if (partnerId === undefined) return;
    const socket = io(apiOrigin(), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: session.accessToken() ?? '' }),
    });
    const refresh = () => void queries.invalidateQueries({ queryKey: partnerOrdersKey });
    let cancelRetry: (() => void) | undefined;
    socket.on('ready', () => {
      useLiveConnected.setState(true, true);
      // Anything that came while it was away.
      refresh();
    });
    socket.on(ORDER_SOCKET_EVENTS.placed, () => {
      Vibration.vibrate(RING);
      refresh();
    });
    socket.on(ORDER_SOCKET_EVENTS.status, refresh);
    socket.on('disconnect', (reason) => {
      useLiveConnected.setState(false, true);
      if (reason !== 'io server disconnect') return;
      // Refused: renew the token through a normal call, then try again.
      cancelRetry?.();
      cancelRetry = renewAndReconnect(
        () => socket.connect(),
        () => api('/partner/orders/counts'),
      );
    });
    return () => {
      cancelRetry?.();
      socket.disconnect();
      useLiveConnected.setState(false, true);
    };
  }, [partnerId, queries]);
}

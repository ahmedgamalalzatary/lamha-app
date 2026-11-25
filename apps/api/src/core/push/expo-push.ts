import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/** One push, as Expo's API takes it. `data.path` is where tapping it goes in the app. */
export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { path: string | null };
  sound: 'default';
  /** The Android channel the app creates (high importance, so it shows on top). */
  channelId: 'default';
}

/** Expo's answer for one message: "error" with DeviceNotRegistered means the app was removed or signed out. */
export interface PushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo takes up to 100 messages per request. */
const CHUNK = 100;

/**
 * Sends pushes through Expo's push HTTP API, no SDK (contract §15.1 #7). EXPO_ACCESS_TOKEN is used
 * when set (push security on in the Expo project). Nothing is sent while NODE_ENV is test: the
 * dashboard's and the app's test servers never reach Expo.
 */
@Injectable()
export class ExpoPush {
  private readonly log = new Logger(ExpoPush.name);
  private readonly token: string | undefined;
  private readonly testing: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('EXPO_ACCESS_TOKEN', { infer: true });
    this.testing = config.get('NODE_ENV', { infer: true }) === 'test';
  }

  /** One ticket per message, in order. A failed request gives error tickets, never throws. */
  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    if (this.testing || messages.length === 0) return messages.map(() => ({ status: 'ok' }));
    const tickets: PushTicket[] = [];
    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK);
      try {
        const res = await fetch(EXPO_URL, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(10_000),
        });
        const json = (await res.json().catch(() => ({}))) as { data?: PushTicket[] };
        if (!res.ok || !Array.isArray(json.data)) throw new Error(`Expo push answered ${res.status}`);
        tickets.push(...json.data);
      } catch (err) {
        this.log.warn(`Push not sent: ${String(err)}`);
        tickets.push(...chunk.map((): PushTicket => ({ status: 'error' })));
      }
    }
    return tickets;
  }
}

@Global()
@Module({ providers: [ExpoPush], exports: [ExpoPush] })
export class PushModule {}

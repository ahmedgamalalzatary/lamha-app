import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessPayload } from '../auth/auth.service.js';
import { UsersRepository } from '../users/users.repository.js';

const storeRoom = (storeId: number) => `store:${storeId}`;

/**
 * Live orders (contract §12 S3): a partner's phone or /partner tab connects with its access token
 * and joins its own store's room, so a store hears only its own orders. Anyone else is disconnected.
 * "ready" tells the client it is listening. The client sends a fresh token when it reconnects.
 */
@WebSocketGateway()
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);
  @WebSocketServer() private readonly server?: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const storeId = await this.storeOf(client).catch((err: unknown) => {
      this.logger.warn(`Live connection check failed: ${String(err)}`);
      return undefined;
    });
    if (storeId === undefined) {
      client.disconnect(true);
      return;
    }
    await client.join(storeRoom(storeId));
    client.emit('ready');
  }

  /** Sends an event to every partner of the store who is connected now. */
  toStore(storeId: number, event: string, payload: unknown): void {
    this.server?.to(storeRoom(storeId)).emit(event, payload);
  }

  /** The partner's store, checked like every HTTP call (AccessTokenGuard): a live, enabled account on its current session. */
  private async storeOf(client: Socket): Promise<number | undefined> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) return undefined;
    const payload = await this.jwt.verifyAsync<AccessPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'access') return undefined;
    const row = await this.users.findLiveById(payload.sub);
    if (!row || row.disabledAt || row.sessionVersion !== payload.ver || row.role !== 'partner') return undefined;
    return row.storeId ?? undefined;
  }
}

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessPayload } from '../auth/auth.service.js';
import { UsersRepository } from '../users/users.repository.js';

const storeRoom = (storeId: number) => `store:${storeId}`;
/** Every delivery man: new offers and offers gone. Whether he may take one is checked when he lists them. */
const DRIVERS_ROOM = 'drivers';
const driverRoom = (userId: number) => `driver:${userId}`;

/**
 * Live orders (contract §12 S3). A partner's phone or /partner tab joins its own store's room, so a
 * store hears only its own orders. A delivery man joins the drivers' room (offers) and his own (his
 * orders). Anyone else is disconnected. "ready" tells the client it is listening. The client sends a
 * fresh token when it reconnects.
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
    const rooms = await this.roomsOf(client).catch((err: unknown) => {
      this.logger.warn(`Live connection check failed: ${String(err)}`);
      return [];
    });
    if (!rooms.length) {
      client.disconnect(true);
      return;
    }
    await client.join(rooms);
    client.emit('ready');
  }

  /** Sends an event to every partner of the store who is connected now. */
  toStore(storeId: number, event: string, payload: unknown): void {
    this.server?.to(storeRoom(storeId)).emit(event, payload);
  }

  /** Sends an event to every delivery man connected now. */
  toDrivers(event: string, payload: unknown): void {
    this.server?.to(DRIVERS_ROOM).emit(event, payload);
  }

  toDriver(userId: number, event: string, payload: unknown): void {
    this.server?.to(driverRoom(userId)).emit(event, payload);
  }

  /** The rooms an account hears, checked like every HTTP call (AccessTokenGuard): a live, enabled account on its current session. */
  private async roomsOf(client: Socket): Promise<string[]> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) return [];
    const payload = await this.jwt.verifyAsync<AccessPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'access') return [];
    const row = await this.users.findLiveById(payload.sub);
    if (!row || row.disabledAt || row.sessionVersion !== payload.ver) return [];
    if (row.role === 'partner') return row.storeId ? [storeRoom(row.storeId)] : [];
    if (row.role === 'driver') return [DRIVERS_ROOM, driverRoom(row.id)];
    return [];
  }
}

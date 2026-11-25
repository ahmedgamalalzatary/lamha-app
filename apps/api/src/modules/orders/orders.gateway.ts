import { Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { ORDER_SOCKET_EVENTS } from '@tawsela/shared';
import type { Server, Socket } from 'socket.io';
import type { AccessPayload } from '../auth/auth.service.js';
import type { UserRow } from '../users/users.schema.js';
import { UsersRepository } from '../users/users.repository.js';

const storeRoom = (storeId: number) => `store:${storeId}`;
/** Every delivery man: new offers and offers gone. Whether he may take one is checked when he lists them. */
const DRIVERS_ROOM = 'drivers';
const driverRoom = (userId: number) => `driver:${userId}`;
const customerRoom = (userId: number) => `customer:${userId}`;
/** How often every open connection's account is checked again. */
const RECHECK_MS = 60_000;

/** Who a connection was let in as, kept on the socket for the recheck. */
interface Admitted {
  userId: number;
  version: number;
  rooms: string[];
}

/**
 * Live orders (contract §12 S3). A partner's phone or /partner tab joins its own store's room, so a
 * store hears only its own orders. A delivery man joins the drivers' room (offers) and his own (his
 * orders). A customer joins their own (their orders' status, §8.8). Anyone else is disconnected.
 * "ready" tells the client it is listening. The client sends a fresh token when it reconnects.
 * Every minute each open connection's account is checked again: disabled, signed out everywhere,
 * deleted or moved to another store, it is dropped (the client then asks again with its token).
 */
@WebSocketGateway()
export class OrdersGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersGateway.name);
  @WebSocketServer() private readonly server?: Server;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.recheck().catch((err: unknown) => this.logger.warn(`Live recheck failed: ${String(err)}`)), RECHECK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async handleConnection(client: Socket): Promise<void> {
    const admitted = await this.admit(client).catch((err: unknown) => {
      this.logger.warn(`Live connection check failed: ${String(err)}`);
      return null;
    });
    if (!admitted) {
      client.disconnect(true);
      return;
    }
    client.data = admitted;
    await client.join(admitted.rooms);
    client.emit('ready');
  }

  /** Drops every connection whose account no longer hears the rooms it joined. */
  async recheck(): Promise<void> {
    const sockets = this.server ? await this.server.fetchSockets() : [];
    const byUser = new Map<number, UserRow | undefined>();
    for (const socket of sockets) {
      const was = socket.data as Admitted | undefined;
      if (!was) continue;
      if (!byUser.has(was.userId)) byUser.set(was.userId, await this.users.findLiveById(was.userId));
      const row = byUser.get(was.userId);
      const now = row && !row.disabledAt && row.sessionVersion === was.version ? roomsFor(row) : [];
      if (now.join() !== was.rooms.join()) socket.disconnect(true);
    }
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

  /** An order's status or captain changed: its store and its customer hear { id, status? }. */
  orderChanged(order: { storeId: number; customerId: number }, payload: { id: number; status?: string }): void {
    this.toStore(order.storeId, ORDER_SOCKET_EVENTS.status, payload);
    this.server?.to(customerRoom(order.customerId)).emit(ORDER_SOCKET_EVENTS.status, payload);
  }

  /** Checked like every HTTP call (AccessTokenGuard): a live, enabled account on its current session. */
  private async admit(client: Socket): Promise<Admitted | null> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) return null;
    const payload = await this.jwt.verifyAsync<AccessPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'access') return null;
    const row = await this.users.findLiveById(payload.sub);
    if (!row || row.disabledAt || row.sessionVersion !== payload.ver) return null;
    const rooms = roomsFor(row);
    return rooms.length ? { userId: row.id, version: row.sessionVersion, rooms } : null;
  }
}

/** The rooms an account hears. */
function roomsFor(row: UserRow): string[] {
  if (row.role === 'partner') return row.storeId ? [storeRoom(row.storeId)] : [];
  if (row.role === 'driver') return [DRIVERS_ROOM, driverRoom(row.id)];
  if (row.role === 'customer') return [customerRoom(row.id)];
  return [];
}

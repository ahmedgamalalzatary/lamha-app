import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { AppNotification, Campaign, CampaignInput, Locale, Notice, NotificationsPage } from '@tawsela/shared';
import { and, desc, eq, exists, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { ExpoPush, type PushMessage } from '../../core/push/expo-push.js';
import { addresses, zones } from '../addresses/addresses.schema.js';
import { nameOf } from '../audit/audit.service.js';
import { drivers, shifts } from '../drivers/drivers.schema.js';
import { users } from '../users/users.schema.js';
import { campaigns, notifications, pushTokens } from './notifications.schema.js';

/** Rows per insert when a campaign fills every customer's الإشعارات. */
const INSERT_CHUNK = 1000;

/** What to tell each account, in its language; null tells that one nothing. */
export type NoticeFor = (locale: Locale) => Notice | null;

interface Send {
  /** Where tapping it goes in the app. */
  path: string | null;
  /** Kept in الإشعارات too (new offers are pushed only). */
  keep: boolean;
}

/**
 * الإشعارات and push (contract §8.14, §9, §10, §11). Every notice is sent after the change it tells
 * of is saved, and never fails the request that caused it: a push that cannot go is logged.
 * Disabled and deleted accounts get nothing; "تفعيل الإشعار" off stops the push, not the list.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly expo: ExpoPush,
  ) {}

  /** Fire and forget: the caller has already answered its own request. */
  tell(userIds: number[], build: NoticeFor, send: Send): void {
    void this.deliver(userIds, build, send).catch((err: unknown) => this.log.warn(`Notice not sent: ${String(err)}`));
  }

  /** Every partner account of a store. */
  async storePartners(storeId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'partner'), eq(users.storeId, storeId)));
    return rows.map((r) => r.id);
  }

  /** The delivery men who may take an offer now: a shift running and not blocked. */
  async workingDrivers(): Promise<number[]> {
    const now = new Date();
    const rows = await this.db
      .selectDistinct({ id: shifts.driverId })
      .from(shifts)
      .innerJoin(drivers, eq(drivers.userId, shifts.driverId))
      .where(and(isNull(shifts.endedAt), gt(shifts.endsAt, now), or(isNull(drivers.blockedUntil), lt(drivers.blockedUntil, now))));
    return rows.map((r) => r.id);
  }

  async registerToken(userId: number, token: string): Promise<void> {
    await this.db
      .insert(pushTokens)
      .values({ userId, token })
      .onDuplicateKeyUpdate({ set: { userId, updatedAt: sql`CURRENT_TIMESTAMP` } });
  }

  async removeToken(userId: number, token: string): Promise<void> {
    await this.db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
  }

  async list(userId: number, limit: number, before?: number): Promise<NotificationsPage> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), before ? lt(notifications.id, before) : undefined))
      .orderBy(desc(notifications.id))
      .limit(limit);
    const [{ unread }] = (await this.db
      .select({ unread: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))) as [{ unread: number }];
    return {
      items: rows.map(
        (r): AppNotification => ({
          id: r.id,
          kind: r.kind,
          title: r.title,
          body: r.body,
          path: r.path,
          read: r.readAt !== null,
          createdAt: r.createdAt.toISOString(),
        }),
      ),
      unread: Number(unread),
    };
  }

  async markAllRead(userId: number): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  }

  /** الإشعارات التفاعلية: sent now to every live customer, or those with an address in the zone [Owner]. */
  async sendCampaign(adminId: number, input: CampaignInput): Promise<Campaign> {
    let zone: { id: number; name: string } | null = null;
    if (input.zoneId !== null) {
      const [row] = await this.db.select({ id: zones.id, name: zones.name }).from(zones).where(eq(zones.id, input.zoneId));
      if (!row) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No zone has this id');
      zone = row;
    }
    const inZone = zone
      ? exists(
          this.db
            .select({ one: sql`1` })
            .from(addresses)
            .where(and(eq(addresses.userId, users.id), eq(addresses.zoneId, zone.id))),
        )
      : undefined;
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'customer'), isNull(users.deletedAt), isNull(users.disabledAt), inZone));
    const ids = rows.map((r) => r.id);
    // The campaign and every customer's الإشعارات entry are saved together before the answer, so
    // "تم الإرسال" never stands for a campaign half kept; only the pushes go after.
    const createdId = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(campaigns)
        .values({ title: input.title, body: input.body, zoneId: zone?.id ?? null, recipients: ids.length, sentById: adminId })
        .$returningId();
      for (let i = 0; i < ids.length; i += INSERT_CHUNK) {
        await tx
          .insert(notifications)
          .values(ids.slice(i, i + INSERT_CHUNK).map((userId) => ({ userId, kind: 'campaign' as const, title: input.title, body: input.body, path: null })));
      }
      return created!.id;
    });
    this.tell(ids, () => ({ kind: 'campaign', title: input.title, body: input.body }), { path: null, keep: false });
    const [sent] = await this.campaignRows(eq(campaigns.id, createdId));
    return sent!;
  }

  campaigns(): Promise<Campaign[]> {
    return this.campaignRows(undefined);
  }

  private async campaignRows(where: ReturnType<typeof eq> | undefined): Promise<Campaign[]> {
    const rows = await this.db
      .select({ campaign: campaigns, zone: { id: zones.id, name: zones.name }, admin: { firstName: users.firstName, lastName: users.lastName } })
      .from(campaigns)
      .innerJoin(users, eq(users.id, campaigns.sentById))
      .leftJoin(zones, eq(zones.id, campaigns.zoneId))
      .where(where)
      .orderBy(desc(campaigns.id))
      .limit(100);
    return rows.map(({ campaign: c, zone, admin }) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      zone: c.zoneId !== null && zone ? { id: zone.id, name: zone.name } : null,
      recipients: c.recipients,
      sentBy: nameOf(admin),
      createdAt: c.createdAt.toISOString(),
    }));
  }

  private async deliver(userIds: number[], build: NoticeFor, send: Send): Promise<void> {
    if (!userIds.length) return;
    const people = await this.db
      .select({ id: users.id, locale: users.locale, enabled: users.notificationsEnabled })
      .from(users)
      .where(and(inArray(users.id, [...new Set(userIds)]), isNull(users.deletedAt), isNull(users.disabledAt)));
    const told = people.flatMap((p) => {
      const n = build(p.locale);
      return n ? [{ ...p, notice: n }] : [];
    });
    if (!told.length) return;
    if (send.keep) {
      await this.db
        .insert(notifications)
        .values(told.map((p) => ({ userId: p.id, kind: p.notice.kind, title: p.notice.title, body: p.notice.body, path: send.path })));
    }
    const pushed = told.filter((p) => p.enabled);
    if (!pushed.length) return;
    const tokens = await this.db
      .select({ userId: pushTokens.userId, token: pushTokens.token })
      .from(pushTokens)
      .where(
        inArray(
          pushTokens.userId,
          pushed.map((p) => p.id),
        ),
      );
    const byUser = new Map(pushed.map((p) => [p.id, p.notice]));
    const messages: PushMessage[] = tokens.map((t) => {
      const n = byUser.get(t.userId)!;
      return { to: t.token, title: n.title, body: n.body, data: { path: send.path }, sound: 'default', channelId: 'default' };
    });
    const tickets = await this.expo.send(messages);
    const gone = messages.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((m) => m.to);
    if (gone.length) await this.db.delete(pushTokens).where(inArray(pushTokens.token, gone));
  }
}

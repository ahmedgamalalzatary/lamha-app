import { Injectable } from '@nestjs/common';
import { firstOrderInTime, inviteExpiry, type InviteOverview, inviteRewardFor, type InviteRewards, type InviteSettings, type InviteStatus } from '@tawsela/shared';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { users } from '../users/users.schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { invites, inviteSettings, type InviteSettingsRow } from './invites.schema.js';

const ROW = 1;
const DAY = 24 * 60 * 60_000;
const cents = (n: number) => Math.round(n * 100) / 100;

const toSettings = (r: InviteSettingsRow): InviteSettings => ({
  reward: r.reward,
  rewardPerOrder: r.rewardPerOrder,
  rewardDays: r.rewardDays,
  friendReward: r.friendReward,
  friendDays: r.friendDays,
  firstOrderDays: r.firstOrderDays,
  monthlyCap: r.monthlyCap,
  expires: r.expires,
});

/** Midnight on the first of this month in Cairo (the monthly cap's month). */
function cairoMonthStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', timeZoneName: 'longOffset' }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const offset = part('timeZoneName').replace('GMT', '') || '+00:00';
  return new Date(`${part('year')}-${part('month')}-01T00:00:00${offset}`);
}

/**
 * ادعُ أصدقاءك (contract §8.17): the friend's welcome money at sign-up, the inviter's reward once the
 * friend's first order is delivered in time and within the month's cap, and the admin's rules.
 */
@Injectable()
export class InvitesService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly wallet: WalletService,
  ) {}

  async settings(tx: Db | Tx = this.db): Promise<InviteSettings> {
    const [row] = await tx.select().from(inviteSettings).where(eq(inviteSettings.id, ROW));
    // The migration inserts the row; a database without it gets the defaults back.
    if (!row) {
      await tx.insert(inviteSettings).values({ id: ROW }).onDuplicateKeyUpdate({ set: { id: ROW } });
      return this.settings(tx);
    }
    return toSettings(row);
  }

  async updateSettings(change: Partial<InviteSettings>): Promise<InviteSettings> {
    await this.settings();
    if (Object.keys(change).length) await this.db.update(inviteSettings).set(change).where(eq(inviteSettings.id, ROW));
    return this.settings();
  }

  /** The home and account cards' amounts (§8.2). */
  async rewards(): Promise<InviteRewards> {
    const s = await this.settings();
    return { reward: s.reward, friendReward: s.friendReward };
  }

  /** A friend signed up with a code: the invite is kept and the friend gets the welcome money. */
  async onSignup(friendId: number, inviterId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const rules = await this.settings(tx);
      const [created] = await tx.insert(invites).values({ inviterId, friendId }).$returningId();
      await this.wallet.grant(tx, friendId, {
        reason: 'invite_welcome',
        amount: rules.friendReward,
        inviteId: created!.id,
        perOrder: null,
        expiresAt: inviteExpiry(new Date(), rules.friendDays, rules.expires),
      });
    });
  }

  /**
   * An order of this customer was delivered: if it is a friend's first, the inviter gets the reward,
   * as long as it came within the days and the month still allows it; otherwise the invite is missed.
   */
  async onDelivered(tx: Tx, customerId: number): Promise<void> {
    const [invite] = await tx
      .select()
      .from(invites)
      .where(and(eq(invites.friendId, customerId), eq(invites.status, 'waiting')))
      .for('update');
    if (!invite) return;
    const rules = await this.settings(tx);
    const now = new Date();
    const amount = firstOrderInTime(invite.createdAt, now, rules.firstOrderDays)
      ? inviteRewardFor(rules.reward, await this.earnedThisMonth(tx, invite.inviterId), rules.monthlyCap)
      : 0;
    if (amount <= 0) {
      await tx.update(invites).set({ status: 'missed' }).where(eq(invites.id, invite.id));
      return;
    }
    await tx.update(invites).set({ status: 'rewarded', reward: amount, rewardedAt: now }).where(eq(invites.id, invite.id));
    await this.wallet.grant(tx, invite.inviterId, {
      reason: 'invite_reward',
      amount,
      inviteId: invite.id,
      perOrder: rules.rewardPerOrder,
      expiresAt: inviteExpiry(now, rules.rewardDays, rules.expires),
    });
  }

  /** ادعُ أصدقاءك: the code, the rules, what was earned and is left, and the friends who joined. */
  async mine(userId: number): Promise<InviteOverview> {
    await this.db.transaction((tx) => this.wallet.expire(tx, userId));
    const rules = await this.settings();
    const [me] = await this.db.select({ code: users.inviteCode }).from(users).where(eq(users.id, userId));
    const rows = await this.db
      .select({ invite: invites, firstName: users.firstName })
      .from(invites)
      .innerJoin(users, eq(users.id, invites.friendId))
      .where(eq(invites.inviterId, userId))
      .orderBy(desc(invites.id))
      .limit(200);
    const [{ earned }] = (await this.db
      .select({ earned: sql<string>`coalesce(sum(${invites.reward}), 0)` })
      .from(invites)
      .where(eq(invites.inviterId, userId))) as [{ earned: string }];
    const available = (await this.wallet.inviteMoney(this.db, [userId])).get(userId) ?? 0;
    const now = Date.now();
    const statusOf = (status: InviteStatus, joined: Date): InviteStatus =>
      status === 'waiting' && now - joined.getTime() > rules.firstOrderDays * DAY ? 'missed' : status;
    return {
      code: me?.code ?? '',
      settings: rules,
      earned: cents(Number(earned)),
      available,
      leftThisMonth: cents(Math.max(0, rules.monthlyCap - (await this.earnedThisMonth(this.db, userId)))),
      friends: rows.map(({ invite, firstName }) => ({
        name: firstName,
        joinedAt: invite.createdAt.toISOString(),
        status: statusOf(invite.status, invite.createdAt),
        reward: invite.reward,
      })),
    };
  }

  private async earnedThisMonth(tx: Db | Tx, inviterId: number): Promise<number> {
    const [row] = (await tx
      .select({ sum: sql<string>`coalesce(sum(${invites.reward}), 0)` })
      .from(invites)
      .where(and(eq(invites.inviterId, inviterId), gte(invites.rewardedAt, cairoMonthStart())))) as [{ sum: string }];
    return cents(Number(row.sum));
  }
}

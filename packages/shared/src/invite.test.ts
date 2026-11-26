import { describe, expect, it } from 'vitest';
import { firstOrderInTime, inviteExpiry, INVITE_DEFAULTS, inviteRewardFor, inviteSettingsProblem, walletPlan } from './invite.js';

const DAY = 24 * 60 * 60_000;

describe('paying with the wallet and its invite money (contract §8.15, §8.17)', () => {
  const reward = { id: 1, left: 300, perOrder: 30, expiresAt: '2026-12-20T00:00:00.000Z' };
  const welcome = { id: 2, left: 25, perOrder: null, expiresAt: '2026-12-10T00:00:00.000Z' };

  it('uses invite money first, the soonest to expire first; a reward gives at most 30 an order', () => {
    expect(walletPlan(100, [reward, welcome], 'restaurant', 200)).toEqual({
      paid: 155,
      regular: 100,
      credits: [
        { id: 2, amount: 25 },
        { id: 1, amount: 30 },
      ],
    });
  });

  it('stops at the total', () => {
    expect(walletPlan(100, [reward, welcome], 'market', 40)).toEqual({
      paid: 40,
      regular: 0,
      credits: [
        { id: 2, amount: 25 },
        { id: 1, amount: 15 },
      ],
    });
  });

  it('leaves invite money out of pharmacy and send-anything orders [Tawsilty]', () => {
    expect(walletPlan(100, [reward, welcome], 'pharmacy', 200)).toEqual({ paid: 100, regular: 100, credits: [] });
    expect(walletPlan(0, [welcome], 'courier', 200)).toEqual({ paid: 0, regular: 0, credits: [] });
  });

  it('shows what the wallet can pay on an order with no total yet', () => {
    expect(walletPlan(100, [reward, welcome], 'restaurant', Number.POSITIVE_INFINITY).paid).toBe(155);
  });

  it('keeps whole piastres', () => {
    expect(walletPlan(0.1 + 0.2, [], 'restaurant', 10).paid).toBe(0.3);
  });
});

describe('the inviter\'s reward (contract §8.17)', () => {
  it('pays the reward up to what the month still allows [Owner: 1000 ج.م a month]', () => {
    expect(inviteRewardFor(300, 0, 1000)).toBe(300);
    expect(inviteRewardFor(300, 900, 1000)).toBe(100);
    expect(inviteRewardFor(300, 1000, 1000)).toBe(0);
  });

  it('counts only a first order delivered within the days after the friend signed up', () => {
    const signedUp = new Date('2026-11-01T10:00:00Z');
    expect(firstOrderInTime(signedUp, new Date(signedUp.getTime() + 29 * DAY), 30)).toBe(true);
    expect(firstOrderInTime(signedUp, new Date(signedUp.getTime() + 30 * DAY), 30)).toBe(true);
    expect(firstOrderInTime(signedUp, new Date(signedUp.getTime() + 30 * DAY + 1), 30)).toBe(false);
  });

  it('dates the expiry from when the money came, or none with expiry switched off [Owner: a switch]', () => {
    const at = new Date('2026-11-01T10:00:00Z');
    expect(inviteExpiry(at, 30, true)?.toISOString()).toBe('2026-12-01T10:00:00.000Z');
    expect(inviteExpiry(at, 30, false)).toBeNull();
  });
});

describe('the admin\'s invite settings (contract §11 A17)', () => {
  it('starts with Tawsilty\'s numbers [Owner: admin settings]', () => {
    expect(INVITE_DEFAULTS).toEqual({
      reward: 300,
      rewardPerOrder: 30,
      rewardDays: 30,
      friendReward: 25,
      friendDays: 30,
      firstOrderDays: 30,
      monthlyCap: 1000,
      expires: true,
    });
  });

  it('refuses negative amounts, a per-order limit over the reward, and days below 1', () => {
    expect(inviteSettingsProblem(INVITE_DEFAULTS)).toBeNull();
    expect(inviteSettingsProblem({ ...INVITE_DEFAULTS, reward: -1 })).toBe('reward');
    expect(inviteSettingsProblem({ ...INVITE_DEFAULTS, rewardPerOrder: 301 })).toBe('rewardPerOrder');
    expect(inviteSettingsProblem({ ...INVITE_DEFAULTS, friendDays: 0 })).toBe('friendDays');
    expect(inviteSettingsProblem({ ...INVITE_DEFAULTS, firstOrderDays: 1.5 })).toBe('firstOrderDays');
  });
});

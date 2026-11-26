import { describe, expect, it } from 'vitest';
import { earnBase, POINTS_ADJUST_MAX, pointsAdjustProblem, pointsEarned, pointsPay, pointsToGo, pointsWorth } from './points.js';
import { cashDue } from './wallet.js';

const RULES = { earnEvery: 10, pointValue: 0.1, minimum: 100 };

describe('earning points (contract §8.16)', () => {
  it('gives a point for every full earnEvery ج.م [Owner: two settings]', () => {
    expect(pointsEarned(170, 10)).toBe(17);
    expect(pointsEarned(179.99, 10)).toBe(17);
    expect(pointsEarned(9.99, 10)).toBe(0);
    expect(pointsEarned(0.3, 0.1)).toBe(3);
    expect(pointsEarned(100, 0)).toBe(0);
  });

  it('counts the items, never the delivery fee; what points paid earns nothing, the wallet does [Owner]', () => {
    expect(earnBase(170, 0)).toBe(170);
    expect(earnBase(170, 20)).toBe(150);
    expect(earnBase(170, 200)).toBe(0);
  });
});

describe('spending points (contract §8.16)', () => {
  it('pays up to what is due, the fee included, and leaves the rest to cash', () => {
    // 120 due, points worth up to 100 (1000 points): all 100 go, 20 in cash.
    expect(pointsPay(1000, 120, RULES)).toEqual({ points: 1000, value: 100 });
    expect(pointsPay(5000, 120, RULES)).toEqual({ points: 1200, value: 120 });
  });

  it('never pays more than is due, in whole points', () => {
    expect(pointsPay(5000, 20.05, RULES)).toEqual({ points: 200, value: 20 });
    expect(pointsPay(5000, 20.05, { ...RULES, pointValue: 0.3 })).toEqual({ points: 66, value: 19.8 });
  });

  it('needs the minimum before any point is spent [Owner: default 100]', () => {
    expect(pointsPay(99, 120, RULES)).toEqual({ points: 0, value: 0 });
    expect(pointsPay(100, 120, RULES)).toEqual({ points: 100, value: 10 });
  });

  it('pays nothing when nothing is due or a point is worth nothing', () => {
    expect(pointsPay(1000, 0, RULES)).toEqual({ points: 0, value: 0 });
    expect(pointsPay(1000, 50, { ...RULES, pointValue: 0 })).toEqual({ points: 0, value: 0 });
  });

  it('shows the value and how many are left to the minimum', () => {
    expect(pointsWorth(240, 0.1)).toBe(24);
    expect(pointsToGo(0, 240)).toBe(240);
    expect(pointsToGo(260, 240)).toBe(0);
  });

  it('leaves the delivery man the cash after the wallet and the points', () => {
    expect(cashDue({ total: 200, walletPaid: 50, pointsPaid: 100 })).toBe(50);
    expect(cashDue({ total: 200, walletPaid: 50 })).toBe(150);
  });
});

describe('the admin adding or deducting points', () => {
  const ok = { kind: 'add' as const, points: 50, note: 'هدية' };
  it('takes whole points above 0 and up to the cap, a reason, and never goes below 0', () => {
    expect(pointsAdjustProblem(ok, 0)).toBeNull();
    expect(pointsAdjustProblem({ ...ok, points: 0 }, 0)).toBe('points');
    expect(pointsAdjustProblem({ ...ok, points: 2.5 }, 0)).toBe('points');
    expect(pointsAdjustProblem({ ...ok, points: POINTS_ADJUST_MAX + 1 }, 0)).toBe('points');
    expect(pointsAdjustProblem({ ...ok, note: ' ' }, 0)).toBe('note');
    expect(pointsAdjustProblem({ ...ok, kind: 'deduct', points: 51 }, 50)).toBe('balance');
    expect(pointsAdjustProblem({ ...ok, kind: 'deduct', points: 50 }, 50)).toBeNull();
  });
});

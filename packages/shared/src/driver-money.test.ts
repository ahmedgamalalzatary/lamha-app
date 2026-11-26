import { describe, expect, it } from 'vitest';
import {
  cairoDayRange,
  driverEarning,
  fineProblem,
  isDayString,
  isFeeRuleOrNull,
  isSpeedLevels,
  minutesPerKm,
  netEarnings,
  speedPoints,
} from './driver-money.js';

describe('minutesPerKm', () => {
  it('divides the minutes from taking the order to delivering it by the km, to two decimals', () => {
    expect(minutesPerKm(25, 2.5)).toBe(10);
    expect(minutesPerKm(20, 3)).toBe(6.67);
  });

  it('is null without a distance (a pickup, an order before distances)', () => {
    expect(minutesPerKm(20, null)).toBeNull();
    expect(minutesPerKm(20, 0)).toBeNull();
  });
});

describe('speedPoints', () => {
  const levels = [
    { maxMinutesPerKm: 12, points: 2 },
    { maxMinutesPerKm: 10, points: 5 },
  ];

  it('gives the points of the fastest level he reached, whatever order the admin wrote them in', () => {
    expect(speedPoints(8, levels)).toBe(5);
    expect(speedPoints(10, levels)).toBe(5);
    expect(speedPoints(11.5, levels)).toBe(2);
    expect(speedPoints(12, levels)).toBe(2);
  });

  it('gives nothing slower than every level, without a speed, or without levels', () => {
    expect(speedPoints(12.01, levels)).toBe(0);
    expect(speedPoints(null, levels)).toBe(0);
    expect(speedPoints(5, [])).toBe(0);
  });
});

describe('isSpeedLevels', () => {
  it('takes up to 10 levels of a positive speed and whole points, no speed twice', () => {
    expect(isSpeedLevels([])).toBe(true);
    expect(isSpeedLevels([{ maxMinutesPerKm: 10, points: 5 }, { maxMinutesPerKm: 12.5, points: 2 }])).toBe(true);
    expect(isSpeedLevels([{ maxMinutesPerKm: 10, points: 5 }, { maxMinutesPerKm: 10, points: 2 }])).toBe(false);
    expect(isSpeedLevels([{ maxMinutesPerKm: 0, points: 5 }])).toBe(false);
    expect(isSpeedLevels([{ maxMinutesPerKm: 10, points: 1.5 }])).toBe(false);
    expect(isSpeedLevels([{ maxMinutesPerKm: 10, points: 0 }])).toBe(false);
    expect(isSpeedLevels(Array.from({ length: 11 }, (_, i) => ({ maxMinutesPerKm: i + 1, points: 1 })))).toBe(false);
    expect(isSpeedLevels(null)).toBe(false);
  });
});

describe('driverEarning', () => {
  const order = { distanceKm: 4.2, deliveryFee: 30, deliveryDiscount: 0 };

  it('is the fee the customer was asked for, a free delivery included, without his own rule', () => {
    expect(driverEarning(order, null)).toBe(30);
    expect(driverEarning({ ...order, deliveryFee: 0, deliveryDiscount: 30 }, null)).toBe(30);
  });

  it('follows his own rule on the same distance (§8.7): only his earning changes', () => {
    // 15 for 3 km, then 4 for each started km: 4.2 km is 2 more.
    expect(driverEarning(order, { baseFee: 15, baseKm: 3, perKm: 4 })).toBe(23);
  });

  it('keeps the fee when the order has no distance', () => {
    expect(driverEarning({ ...order, distanceKm: null }, { baseFee: 15, baseKm: 3, perKm: 4 })).toBe(30);
  });
});

describe('isFeeRuleOrNull', () => {
  it('takes null or three amounts within the delivery settings limits', () => {
    expect(isFeeRuleOrNull(null)).toBe(true);
    expect(isFeeRuleOrNull({ baseFee: 15, baseKm: 2.5, perKm: 4 })).toBe(true);
    expect(isFeeRuleOrNull({ baseFee: 15, baseKm: 2 })).toBe(false);
    expect(isFeeRuleOrNull({ baseFee: -1, baseKm: 2, perKm: 4 })).toBe(false);
    expect(isFeeRuleOrNull({ baseFee: 15.555, baseKm: 2, perKm: 4 })).toBe(false);
    expect(isFeeRuleOrNull({ baseFee: 15, baseKm: 2000, perKm: 4 })).toBe(false);
  });
});

describe('netEarnings', () => {
  it('is his earnings and speed points cash less his fines', () => {
    expect(netEarnings({ earnings: 525, pointsCash: 12.5, fines: 50 })).toBe(487.5);
  });
});

describe('isDayString and cairoDayRange', () => {
  it('takes real dates written YYYY-MM-DD', () => {
    expect(isDayString('2026-11-22')).toBe(true);
    expect(isDayString('2026-02-30')).toBe(false);
    expect(isDayString('2026-1-01')).toBe(false);
  });

  it('runs from the first day at midnight in Cairo to the end of the last day', () => {
    const { from, to } = cairoDayRange('2026-01-01', '2026-11-22');
    expect(from.toISOString()).toBe('2025-12-31T22:00:00.000Z');
    expect(to.toISOString()).toBe('2026-11-22T22:00:00.000Z');
  });

  it('swaps the days when they come the wrong way round', () => {
    expect(cairoDayRange('2026-11-22', '2026-11-20')).toEqual(cairoDayRange('2026-11-20', '2026-11-22'));
  });
});

describe('fineProblem', () => {
  it('needs an amount over 0 with at most two decimals, and a reason', () => {
    expect(fineProblem({ amount: 50, reason: 'تأخير في التوصيل' })).toBeNull();
    expect(fineProblem({ amount: 0, reason: 'x' })).toBe('amount');
    expect(fineProblem({ amount: 10.555, reason: 'x' })).toBe('amount');
    expect(fineProblem({ amount: 20_000, reason: 'x' })).toBe('amount');
    expect(fineProblem({ amount: 10, reason: '   ' })).toBe('reason');
    expect(fineProblem({ amount: 10, reason: 'x'.repeat(201) })).toBe('reason');
  });
});

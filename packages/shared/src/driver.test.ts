import { describe, expect, it } from 'vitest';
import { canStartShift, DEFAULT_DRIVER_RULES, driverStep, fromCairo, isWeekSchedule, shiftAt, skipOutcome, startWindow, type WeekSchedule } from './driver.js';

const rules = DEFAULT_DRIVER_RULES;
/** Every day 18:00–02:00 in Cairo, except Friday (5) with no shift. */
const week: WeekSchedule = [0, 1, 2, 3, 4, 5, 6].map((d) => (d === 5 ? null : { start: '18:00', end: '02:00' }));
/** A Cairo wall time. 2026-11-25 is a Wednesday (3); Egypt has no summer time in November (UTC+2). */
const cairo = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  return fromCairo(y, m, d, h * 60 + min);
};

describe('isWeekSchedule', () => {
  const week = (...days: (null | [string, string])[]) => [...days, ...Array(7 - days.length).fill(null)].map((d) => (d ? { start: d[0], end: d[1] } : null));

  it('takes 7 days of HH:MM ranges or null', () => {
    expect(isWeekSchedule(week(['18:00', '02:00'], null, ['08:00', '16:00']))).toBe(true);
    expect(isWeekSchedule(week(['8:00', '16:00']))).toBe(false);
    expect(isWeekSchedule([null])).toBe(false);
  });

  it("refuses a shift past midnight that runs into the next day's shift", () => {
    expect(isWeekSchedule(week(['18:00', '02:00'], ['01:00', '09:00']))).toBe(false);
    expect(isWeekSchedule(week(['18:00', '02:00'], ['02:00', '09:00']))).toBe(true);
    // Saturday runs into Sunday.
    expect(isWeekSchedule([{ start: '01:00', end: '09:00' }, null, null, null, null, null, { start: '20:00', end: '03:00' }])).toBe(false);
  });

  it('a same-time shift runs 24 hours, so it may not run into the next day either', () => {
    expect(isWeekSchedule(week(['18:00', '18:00'], ['09:00', '17:00']))).toBe(false);
    expect(isWeekSchedule(week(['18:00', '18:00'], ['18:00', '22:00']))).toBe(true);
  });

  it('00:00 to 00:00 ends at midnight, so the next day may start at 00:00', () => {
    expect(isWeekSchedule(week(['00:00', '00:00'], ['00:00', '08:00']))).toBe(true);
  });
});

describe('fromCairo', () => {
  it('turns a Cairo wall time into the instant, winter and summer', () => {
    expect(cairo('2026-11-25', '18:00').toISOString()).toBe('2026-11-25T16:00:00.000Z');
    // Summer time (UTC+3) from the last Friday of April to the last Thursday of October.
    expect(cairo('2026-07-01', '18:00').toISOString()).toBe('2026-07-01T15:00:00.000Z');
  });
});

describe('shiftAt (the weekly schedule, contract §10)', () => {
  it('gives the shift running now, which may have started yesterday', () => {
    expect(shiftAt(week, cairo('2026-11-25', '20:00'))).toEqual({ startsAt: cairo('2026-11-25', '18:00'), endsAt: cairo('2026-11-26', '02:00') });
    expect(shiftAt(week, cairo('2026-11-26', '01:30'))).toEqual({ startsAt: cairo('2026-11-25', '18:00'), endsAt: cairo('2026-11-26', '02:00') });
  });

  it('otherwise gives the next one, skipping a day without a shift', () => {
    expect(shiftAt(week, cairo('2026-11-25', '10:00'))?.startsAt).toEqual(cairo('2026-11-25', '18:00'));
    // Thursday night's shift ends at 02:00 Friday; Friday has none, so the next is Saturday's.
    expect(shiftAt(week, cairo('2026-11-27', '03:00'))?.startsAt).toEqual(cairo('2026-11-28', '18:00'));
  });

  it('runs a whole day when the start and end are the same', () => {
    const allDay: WeekSchedule = Array.from({ length: 7 }, () => ({ start: '08:00', end: '08:00' }));
    expect(shiftAt(allDay, cairo('2026-11-25', '09:00'))).toEqual({ startsAt: cairo('2026-11-25', '08:00'), endsAt: cairo('2026-11-26', '08:00') });
  });

  it('is null for a week without shifts', () => {
    expect(shiftAt(Array.from({ length: 7 }, () => null), cairo('2026-11-25', '09:00'))).toBeNull();
  });
});

describe('starting a shift: from 30 minutes before until 15 after it starts', () => {
  const shift = { startsAt: cairo('2026-11-25', '18:00'), endsAt: cairo('2026-11-26', '02:00') };

  it('opens and closes the window', () => {
    expect(startWindow(shift, rules)).toEqual({ from: cairo('2026-11-25', '17:30'), to: cairo('2026-11-25', '18:15') });
  });

  it('lets him start only inside it', () => {
    expect(canStartShift(shift, cairo('2026-11-25', '17:29'), rules)).toBe(false);
    expect(canStartShift(shift, cairo('2026-11-25', '17:30'), rules)).toBe(true);
    expect(canStartShift(shift, cairo('2026-11-25', '18:15'), rules)).toBe(true);
    expect(canStartShift(shift, cairo('2026-11-25', '18:16'), rules)).toBe(false);
  });

  it('follows the admin\'s numbers', () => {
    expect(canStartShift(shift, cairo('2026-11-25', '17:15'), { ...rules, startEarlyMinutes: 45 })).toBe(true);
  });
});

describe('skipOutcome (skips in a row)', () => {
  it('warns after 2 and blocks after 3', () => {
    expect(skipOutcome(1, rules)).toBeNull();
    expect(skipOutcome(2, rules)).toBe('warn');
    expect(skipOutcome(3, rules)).toBe('block');
    expect(skipOutcome(4, rules)).toBe('block');
  });

  it('follows the admin\'s numbers', () => {
    expect(skipOutcome(3, { ...rules, skipWarn: 3, skipBlock: 5 })).toBe('warn');
  });
});

describe('driverStep (accept → at the store → خارج للتوصيل → delivered)', () => {
  it('he arrives at the store while it prepares or once it is ready', () => {
    expect(driverStep({ status: 'preparing', atStore: false }, 'arrived')).toEqual({ atStore: true });
    expect(driverStep({ status: 'ready', atStore: false }, 'arrived')).toEqual({ atStore: true });
    expect(driverStep({ status: 'ready', atStore: true }, 'arrived')).toBeNull();
  });

  it('he goes out only from the store with the order ready', () => {
    expect(driverStep({ status: 'preparing', atStore: true }, 'out')).toBeNull();
    expect(driverStep({ status: 'ready', atStore: false }, 'out')).toBeNull();
    expect(driverStep({ status: 'ready', atStore: true }, 'out')).toEqual({ status: 'out_for_delivery' });
  });

  it('he delivers only an order on its way', () => {
    expect(driverStep({ status: 'out_for_delivery', atStore: true }, 'delivered')).toEqual({ status: 'delivered' });
    expect(driverStep({ status: 'ready', atStore: true }, 'delivered')).toBeNull();
    expect(driverStep({ status: 'delivered', atStore: true }, 'delivered')).toBeNull();
  });
});

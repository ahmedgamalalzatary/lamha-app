import { describe, expect, it } from 'vitest';
import { defaultLayout, isOpenAt, isTimeOfDay, minuteOfDay } from '../../src/catalog.js';

describe('isTimeOfDay ("HH:MM", 24-hour)', () => {
  it.each(['00:00', '09:30', '23:59'])('accepts %s', (t) => expect(isTimeOfDay(t)).toBe(true));
  it.each(['24:00', '9:30', '12:60', '1230', '', '12:30:00'])('refuses %s', (t) => expect(isTimeOfDay(t)).toBe(false));
});

describe('minuteOfDay', () => {
  it('turns "HH:MM" into minutes after midnight', () => {
    expect(minuteOfDay('00:00')).toBe(0);
    expect(minuteOfDay('13:45')).toBe(825);
  });
});

describe('isOpenAt (store hours in Cairo time; the "مغلق" pill, contract §6.3)', () => {
  const day = { opensAt: '10:00', closesAt: '23:00', closedNow: false };

  it('is open from the opening minute up to, not including, the closing minute', () => {
    expect(isOpenAt(day, minuteOfDay('09:59'))).toBe(false);
    expect(isOpenAt(day, minuteOfDay('10:00'))).toBe(true);
    expect(isOpenAt(day, minuteOfDay('22:59'))).toBe(true);
    expect(isOpenAt(day, minuteOfDay('23:00'))).toBe(false);
  });

  it('handles hours that run past midnight', () => {
    const late = { opensAt: '18:00', closesAt: '02:00', closedNow: false };
    expect(isOpenAt(late, minuteOfDay('17:59'))).toBe(false);
    expect(isOpenAt(late, minuteOfDay('23:30'))).toBe(true);
    expect(isOpenAt(late, minuteOfDay('01:59'))).toBe(true);
    expect(isOpenAt(late, minuteOfDay('02:00'))).toBe(false);
  });

  it('is open all day when it opens and closes at the same time', () => {
    const allDay = { opensAt: '00:00', closesAt: '00:00', closedNow: false };
    expect(isOpenAt(allDay, 0)).toBe(true);
    expect(isOpenAt(allDay, minuteOfDay('15:00'))).toBe(true);
  });

  it('is closed whenever the store switched itself to closed now', () => {
    expect(isOpenAt({ ...day, closedNow: true }, minuteOfDay('12:00'))).toBe(false);
  });
});

describe('defaultLayout (contract §8.4: restaurants list, markets and pharmacies grid)', () => {
  it.each([
    ['restaurant', 'list'],
    ['courier', 'list'],
    ['market', 'grid'],
    ['pharmacy', 'grid'],
  ] as const)('%s → %s', (vertical, layout) => expect(defaultLayout(vertical)).toBe(layout));
});

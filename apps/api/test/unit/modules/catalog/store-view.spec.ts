import { cairoMinuteOfDay } from '../../../../src/modules/catalog/store-view.js';

describe('cairoMinuteOfDay (contract §7: store hours are Cairo time)', () => {
  it('is UTC+2 in winter', () => {
    expect(cairoMinuteOfDay(new Date('2026-01-15T08:30:00Z'))).toBe(10 * 60 + 30);
  });

  it('is UTC+3 in summer (Egypt keeps daylight saving time)', () => {
    expect(cairoMinuteOfDay(new Date('2026-07-15T08:30:00Z'))).toBe(11 * 60 + 30);
  });

  it('wraps past midnight', () => {
    expect(cairoMinuteOfDay(new Date('2026-01-15T22:15:00Z'))).toBe(15);
  });
});

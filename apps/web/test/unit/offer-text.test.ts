import { describe, expect, it } from 'vitest';
import { cairoDate, couponText, endOfCairoDay } from '@/features/offers/offer-text';

describe('couponText (the same words as the app, §8.4)', () => {
  it('reads an amount with its minimum, and a percentage with its cap', () => {
    expect(couponText({ kind: 'amount', value: 6, maxDiscount: null, minOrder: 150 })).toBe('خصم 6 ج.م على 150 ج.م');
    expect(couponText({ kind: 'percent', value: 20, maxDiscount: 50, minOrder: 0 })).toBe('خصم 20% (حتى 50 ج.م)');
  });
});

describe('endOfCairoDay ("صالح حتى" is the whole day in Cairo)', () => {
  it('ends at 23:59:59 Cairo time, in winter (+2) and in summer time (+3)', () => {
    expect(endOfCairoDay('2026-11-30')).toBe('2026-11-30T21:59:59.000Z');
    expect(endOfCairoDay('2026-07-15')).toBe('2026-07-15T20:59:59.000Z');
    expect(endOfCairoDay('')).toBeNull();
  });

  it('shows a stored end back as its Cairo day', () => {
    expect(cairoDate('2026-11-30T21:59:59.000Z')).toBe('2026-11-30');
    expect(cairoDate(null)).toBe('');
  });
});

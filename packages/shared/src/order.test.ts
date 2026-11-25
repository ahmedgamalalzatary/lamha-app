import { describe, expect, it } from 'vitest';
import { deliveryFeeFor, deliverySlots, payout, slotLabel } from './order.js';

const rule = { baseFee: 20, baseKm: 2, perKm: 10 };

describe('deliveryFeeFor', () => {
  it('charges the base fee up to the base distance', () => {
    expect(deliveryFeeFor(0, rule)).toBe(20);
    expect(deliveryFeeFor(2, rule)).toBe(20);
  });

  it('charges a started kilometre over the base as a whole one', () => {
    expect(deliveryFeeFor(2.3, rule)).toBe(30);
    expect(deliveryFeeFor(3, rule)).toBe(30);
    expect(deliveryFeeFor(4.01, rule)).toBe(50);
  });

  it('does not charge a kilometre for a few metres of rounding noise', () => {
    expect(deliveryFeeFor(3.0000001, rule)).toBe(30);
  });

  it('keeps piastres', () => {
    expect(deliveryFeeFor(3.5, { baseFee: 12.5, baseKm: 1, perKm: 7.25 })).toBe(34.25);
  });
});

describe('payout', () => {
  it('option 1: the delivery man pays the store the whole items total', () => {
    expect(payout(205, 'fee_only', 10)).toEqual({ appShare: 0, storeGets: 205, storeFromDriver: 205 });
  });

  it('option 2: the delivery man keeps the app share and pays the store the rest', () => {
    expect(payout(205, 'app_share', 10)).toEqual({ appShare: 20.5, storeGets: 184.5, storeFromDriver: 184.5 });
    expect(payout(95, 'app_share', 10)).toEqual({ appShare: 9.5, storeGets: 85.5, storeFromDriver: 85.5 });
  });

  it('option 3: the store gets nothing from the delivery man; the app owes it later', () => {
    expect(payout(205, 'nothing', 10)).toEqual({ appShare: 20.5, storeGets: 184.5, storeFromDriver: 0 });
  });

  it('rounds the share to piastres', () => {
    expect(payout(33.33, 'app_share', 7)).toEqual({ appShare: 2.33, storeGets: 31, storeFromDriver: 31 });
  });
});

describe('deliverySlots', () => {
  const hours = (opensAt: string, closesAt: string, closedNow = false) => ({ opensAt, closesAt, closedNow });
  const at = (time: string) => {
    const [h = 0, m = 0] = time.split(':').map(Number);
    return h * 60 + m;
  };

  it('offers every half hour from at least 30 minutes ahead until the store closes', () => {
    expect(deliverySlots(at('20:05'), hours('10:00', '23:00'))).toEqual([at('21:00'), at('21:30'), at('22:00'), at('22:30')]);
    expect(deliverySlots(at('20:00'), hours('10:00', '23:00'))[0]).toBe(at('20:30'));
  });

  it('starts at the opening time when the store opens later today', () => {
    expect(deliverySlots(at('08:00'), hours('12:00', '13:30'))).toEqual([at('12:00'), at('12:30'), at('13:00')]);
  });

  it('runs past midnight when the store does, as minutes after today\'s midnight', () => {
    expect(deliverySlots(at('23:10'), hours('18:00', '01:00'))).toEqual([at('23:59') + 1, at('23:59') + 31]);
  });

  it('ends at midnight for a store open all day', () => {
    expect(deliverySlots(at('22:40'), hours('00:00', '00:00'))).toEqual([at('23:30')]);
  });

  it('offers nothing while the store is switched to closed', () => {
    expect(deliverySlots(at('12:00'), hours('10:00', '23:00', true))).toEqual([]);
  });
});

describe('slotLabel', () => {
  it('reads like Tawsilty\'s list', () => {
    expect(slotLabel(20 * 60 + 30)).toBe('8:30 PM');
    expect(slotLabel(12 * 60)).toBe('12:00 PM');
    expect(slotLabel(24 * 60 + 30)).toBe('12:30 AM');
    expect(slotLabel(9 * 60)).toBe('9:00 AM');
  });
});

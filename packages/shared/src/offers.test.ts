import { describe, expect, it } from 'vitest';
import {
  couponDiscount,
  couponInputProblem,
  couponProblem,
  deliveryDiscount,
  discountRange,
  hasOffer,
  normalizeCode,
  productSaving,
  storeItemsBase,
  type CouponInput,
  type CouponRule,
} from './offers.js';

const now = new Date('2026-11-26T12:00:00.000Z');

const blackFriday: CouponRule = {
  active: true,
  storeId: 7,
  kind: 'amount',
  value: 6,
  maxDiscount: null,
  minOrder: 150,
  startsAt: null,
  endsAt: '2026-11-30T21:59:59.000Z',
  perCustomer: 1,
  totalLimit: null,
};

describe('a code at checkout (contract §8.7 "وفر على طلبك", §8.10)', () => {
  it('matches however it is typed: "Black Friday" and " black  friday "', () => {
    expect(normalizeCode(' black  friday ')).toBe(normalizeCode('Black Friday'));
  });

  it('takes a fixed amount off the items: "خصم 6 ج.م على 150 ج.م"', () => {
    expect(couponDiscount(blackFriday, 350)).toBe(6);
  });

  it('takes a percentage off, up to its cap [Owner, 2026-11-26]', () => {
    expect(couponDiscount({ kind: 'percent', value: 20, maxDiscount: 50 }, 120)).toBe(24);
    expect(couponDiscount({ kind: 'percent', value: 20, maxDiscount: 50 }, 400)).toBe(50);
    expect(couponDiscount({ kind: 'percent', value: 15, maxDiscount: null }, 99.99)).toBe(15);
  });

  it('never takes off more than the items cost', () => {
    expect(couponDiscount({ kind: 'amount', value: 100, maxDiscount: null }, 60)).toBe(60);
  });

  const ok = { now, storeId: 7, itemsTotal: 150, usedByMe: 0, usedByAll: 0 };

  it('works at its store from its minimum order', () => {
    expect(couponProblem(blackFriday, ok)).toBeNull();
  });

  it('works at every store when it names none', () => {
    expect(couponProblem({ ...blackFriday, storeId: null }, { ...ok, storeId: 99 })).toBeNull();
  });

  it('says why it cannot be used', () => {
    expect(couponProblem({ ...blackFriday, active: false }, ok)).toBe('COUPON_NOT_FOUND');
    expect(couponProblem(blackFriday, { ...ok, now: new Date('2026-12-01T00:00:00.000Z') })).toBe('COUPON_NOT_FOUND');
    expect(couponProblem({ ...blackFriday, startsAt: '2026-11-27T00:00:00.000Z' }, ok)).toBe('COUPON_NOT_FOUND');
    expect(couponProblem(blackFriday, { ...ok, storeId: 8 })).toBe('COUPON_STORE');
    expect(couponProblem(blackFriday, { ...ok, itemsTotal: 149.99 })).toBe('COUPON_MIN_ORDER');
    expect(couponProblem(blackFriday, { ...ok, usedByMe: 1 })).toBe('COUPON_USED');
    expect(couponProblem({ ...blackFriday, perCustomer: 3 }, { ...ok, usedByMe: 2 })).toBeNull();
    expect(couponProblem({ ...blackFriday, totalLimit: 100 }, { ...ok, usedByAll: 100 })).toBe('COUPON_GONE');
  });
});

describe('the admin\'s code form', () => {
  const input: CouponInput = {
    code: 'Black Friday',
    title: 'Black Friday',
    storeId: null,
    kind: 'amount',
    value: 6,
    maxDiscount: null,
    minOrder: 150,
    startsAt: null,
    endsAt: null,
    perCustomer: 1,
    totalLimit: null,
    paidBy: 'app',
    active: true,
  };

  it('accepts a whole code', () => {
    expect(couponInputProblem(input)).toBeNull();
    expect(couponInputProblem({ ...input, kind: 'percent', value: 20, maxDiscount: 50 })).toBeNull();
  });

  it('turns down what cannot work', () => {
    expect(couponInputProblem({ ...input, code: '  ' })).toBe('code');
    expect(couponInputProblem({ ...input, value: 0 })).toBe('value');
    expect(couponInputProblem({ ...input, kind: 'percent', value: 101 })).toBe('value');
    expect(couponInputProblem({ ...input, maxDiscount: 0 })).toBe('maxDiscount');
    expect(couponInputProblem({ ...input, perCustomer: 0 })).toBe('perCustomer');
    expect(couponInputProblem({ ...input, totalLimit: 0 })).toBe('totalLimit');
    expect(couponInputProblem({ ...input, startsAt: '2026-12-02T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' })).toBe('endsAt');
  });
});

describe('free delivery (contract §8.4 "توصيل مجاني للطلبات من 1000 ج.م")', () => {
  it('waives the fee from the store\'s amount; 0 means always', () => {
    expect(deliveryDiscount(1000, 999.99, 15)).toBe(0);
    expect(deliveryDiscount(1000, 1000, 15)).toBe(15);
    expect(deliveryDiscount(0, 20, 15)).toBe(15);
    expect(deliveryDiscount(null, 5000, 15)).toBe(0);
  });
});

describe('product discounts (contract §8.4 "وفر 5.0 ج.م")', () => {
  it('saves the old price less the price', () => {
    expect(productSaving({ price: 15, oldPrice: 20 })).toBe(5);
    expect(productSaving({ price: 426, oldPrice: 481 })).toBe(55);
    expect(productSaving({ price: 20, oldPrice: null })).toBe(0);
    expect(productSaving({ price: 20, oldPrice: 20 })).toBe(0);
  });

  it('reads "خصم 30 ج.م" when every saving is the same, "خصم حتى 60 ج.م" when not', () => {
    expect(discountRange([30, 30])).toEqual({ upTo: 30, same: true });
    expect(discountRange([15, 60, 0])).toEqual({ upTo: 60, same: false });
    expect(discountRange([0])).toBeNull();
    expect(discountRange([])).toBeNull();
  });
});

describe('who pays for a discount (set per offer) [Owner, 2026-11-26]', () => {
  it('pays the store its full price when the app pays, less the discount when the store pays', () => {
    // 350 of items after product discounts; 20 of them the app pays for.
    expect(storeItemsBase({ itemsTotal: 350, appProductSaving: 20, coupon: { discount: 6, paidBy: 'app' }, delivery: null })).toBe(370);
    expect(storeItemsBase({ itemsTotal: 350, appProductSaving: 0, coupon: { discount: 6, paidBy: 'store' }, delivery: null })).toBe(344);
  });

  it('charges the store the waived fee when it pays for free delivery', () => {
    expect(storeItemsBase({ itemsTotal: 350, appProductSaving: 0, coupon: null, delivery: { discount: 15, paidBy: 'store' } })).toBe(335);
    expect(storeItemsBase({ itemsTotal: 350, appProductSaving: 0, coupon: null, delivery: { discount: 15, paidBy: 'app' } })).toBe(350);
  });
});

describe('the offers screen tabs (contract §8.10)', () => {
  const offers = { voucher: null, freeDeliveryFrom: 300, discount: { upTo: 30, same: true } };
  it('lists a store under each kind of offer it has', () => {
    expect(hasOffer(offers, 'discounts')).toBe(true);
    expect(hasOffer(offers, 'delivery')).toBe(true);
    expect(hasOffer(offers, 'coupons')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { canReorder, customerStatusLabel, customerSteps } from '../../src/customer-order.js';

describe('customerSteps', () => {
  it('lists a delivery from review to delivered, marking where it is now', () => {
    expect(customerSteps('preparing', 'delivery')).toEqual([
      { status: 'pending_review', state: 'done' },
      { status: 'preparing', state: 'current' },
      { status: 'ready', state: 'next' },
      { status: 'out_for_delivery', state: 'next' },
      { status: 'delivered', state: 'next' },
    ]);
  });

  it('skips "out for delivery" for a pickup', () => {
    expect(customerSteps('ready', 'pickup')!.map((s) => [s.status, s.state])).toEqual([
      ['pending_review', 'done'],
      ['preparing', 'done'],
      ['ready', 'current'],
      ['delivered', 'next'],
    ]);
  });

  it('marks every step done once delivered', () => {
    expect(customerSteps('delivered', 'delivery')!.every((s) => s.state === 'done')).toBe(true);
  });

  it('has no steps for a rejected or cancelled order', () => {
    expect(customerSteps('rejected', 'delivery')).toBeNull();
    expect(customerSteps('cancelled', 'pickup')).toBeNull();
  });
});

describe('customerStatusLabel', () => {
  it('reads like the store and dashboard for a delivery', () => {
    expect(customerStatusLabel('delivered', 'delivery')).toBe('تم التوصيل');
    expect(customerStatusLabel('preparing', 'delivery', 'en')).toBe('Preparing');
  });

  it('speaks of picking up for a pickup', () => {
    expect(customerStatusLabel('ready', 'pickup')).toBe('جاهز للاستلام');
    expect(customerStatusLabel('delivered', 'pickup')).toBe('تم الاستلام');
    expect(customerStatusLabel('delivered', 'pickup', 'en')).toBe('Picked up');
  });
});

describe('canReorder', () => {
  it('offers "اطلب تاني" only once the order is over', () => {
    expect(canReorder('delivered')).toBe(true);
    expect(canReorder('rejected')).toBe(true);
    expect(canReorder('cancelled')).toBe(true);
    expect(canReorder('pending_review')).toBe(false);
    expect(canReorder('out_for_delivery')).toBe(false);
  });
});

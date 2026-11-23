import { describe, expect, it } from 'vitest';
import {
  ADDRESS_TYPES,
  ORDER_STATUSES,
  ROLES,
  VERTICALS,
  addressTypeLabel,
  isOrderStatus,
  isRole,
  orderStatusLabel,
  roleLabel,
  verticalLabel,
} from './enums.js';

describe('labels', () => {
  it('every role, vertical, order status and address type has an Arabic and an English label', () => {
    for (const locale of ['ar', 'en'] as const) {
      for (const r of ROLES) expect(roleLabel(r, locale)).not.toBe('');
      for (const v of VERTICALS) expect(verticalLabel(v, locale)).not.toBe('');
      for (const s of ORDER_STATUSES) expect(orderStatusLabel(s, locale)).not.toBe('');
      for (const a of ADDRESS_TYPES) expect(addressTypeLabel(a, locale)).not.toBe('');
    }
  });

  it('uses the words Tawsilty shows for order statuses (contract §9)', () => {
    expect(orderStatusLabel('pending_review')).toBe('قيد المراجعة');
    expect(orderStatusLabel('out_for_delivery')).toBe('جارية التوصيل');
    expect(orderStatusLabel('delivered')).toBe('تم التوصيل');
  });

  it('uses the address type chips from the address form (contract §8.9)', () => {
    expect(ADDRESS_TYPES.map((t) => addressTypeLabel(t))).toEqual(['شقة', 'مكتب', 'فيلا']);
  });
});

describe('guards', () => {
  it('isRole accepts only the four roles', () => {
    expect(isRole('driver')).toBe(true);
    expect(isRole('superadmin')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it('isOrderStatus rejects unknown values', () => {
    expect(isOrderStatus('preparing')).toBe(true);
    expect(isOrderStatus('lost')).toBe(false);
  });
});

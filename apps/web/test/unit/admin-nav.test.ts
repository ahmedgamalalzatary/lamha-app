import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, filterNav, isActive } from '@/features/nav/admin-nav';

const labels = (groups: ReturnType<typeof filterNav>) =>
  groups.map((g) => [g.label, ...g.items.map((i) => i.label)]);

describe('ADMIN_NAV (Tawsilty admin sidebar, contract §11)', () => {
  it('lists the sections in Tawsilty order', () => {
    expect(ADMIN_NAV.map((g) => g.label)).toEqual([
      'الرئيسية',
      'الطلبات',
      'العملاء',
      'الموردين',
      'المندوبين',
      'المنتجات والكتالوج',
      'التسويق والعروض',
      'التقارير',
      'الإعدادات',
    ]);
  });
});

describe('filterNav ("ابحث عن شاشة…")', () => {
  it('returns everything for an empty search', () => {
    expect(filterNav(ADMIN_NAV, '  ')).toEqual(ADMIN_NAV);
  });

  it('keeps only the matching pages, under their section', () => {
    expect(labels(filterNav(ADMIN_NAV, 'غير فعالة'))).toEqual([['المنتجات والكتالوج', 'منتجات غير فعالة']]);
  });

  it('keeps a whole section when its own name matches', () => {
    expect(labels(filterNav(ADMIN_NAV, 'التسويق'))).toEqual([['التسويق والعروض', 'الإشعارات التفاعلية']]);
  });

  it('ignores alef and taa marbuta spelling differences', () => {
    expect(labels(filterNav(ADMIN_NAV, 'الاشعارات'))).toEqual([['التسويق والعروض', 'الإشعارات التفاعلية']]);
    expect(labels(filterNav(ADMIN_NAV, 'فعاله'))).toEqual([['المنتجات والكتالوج', 'منتجات غير فعالة']]);
  });

  it('returns nothing when no page matches', () => {
    expect(filterNav(ADMIN_NAV, 'zzz')).toEqual([]);
  });
});

describe('isActive', () => {
  it('marks the page and its sub-pages', () => {
    expect(isActive('/orders', '/orders')).toBe(true);
    expect(isActive('/orders/504578', '/orders')).toBe(true);
  });

  it('does not mark a page whose path only starts the same', () => {
    expect(isActive('/products-inactive', '/products')).toBe(false);
  });

  it('marks home only on home', () => {
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/orders', '/')).toBe(false);
  });
});

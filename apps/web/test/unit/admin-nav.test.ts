import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, activeHref, filterNav, isActive, navHrefs, PARTNER_NAV, pageTitle } from '@/features/nav/admin-nav';

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

  it('keeps Tawsilty\'s two catalog pages first, then cuisines and home tiles (A12, Phase 4)', () => {
    expect(ADMIN_NAV.find((g) => g.label === 'المنتجات والكتالوج')?.items.map((i) => i.href)).toEqual([
      '/products',
      '/products/inactive',
      '/catalog/cuisines',
      '/catalog/home-tiles',
      '/catalog/home-sections',
    ]);
  });

  it('puts the delivery zones (§8.9), the delivery fee and payment settings (§8.7), the points rules (§8.16), the contact numbers (§8.14), the admin accounts (A23) and the change log (review F70) under الإعدادات', () => {
    expect(ADMIN_NAV.at(-1)?.items).toEqual([
      { label: 'المناطق', href: '/settings/zones' },
      { label: 'رسوم التوصيل والدفع', href: '/settings/delivery' },
      { label: 'النقاط', href: '/settings/points' },
      { label: 'أرقام التواصل', href: '/settings/support' },
      { label: 'حسابات الإدارة', href: '/settings/admins' },
      { label: 'سجل التغييرات', href: '/settings/audit' },
    ]);
  });
});

describe('PARTNER_NAV (the partner area, contract §11.1)', () => {
  it('lists the partner pages, all under /partner', () => {
    expect(PARTNER_NAV.map((g) => [g.label, g.href])).toEqual([
      ['الطلبات', '/partner/orders'],
      ['المنتجات', '/partner/products'],
      ['المتجر', '/partner/store'],
      ['التقارير', '/partner/reports'],
      ['الحساب', '/partner/account'],
    ]);
  });
});

describe('pageTitle', () => {
  it("names the page from the sidebar, and falls back to the area's name", () => {
    expect(pageTitle('/products/inactive')).toBe('منتجات غير فعالة');
    expect(pageTitle('/partner/store')).toBe('المتجر');
    expect(pageTitle('/')).toBe('الرئيسية');
    expect(pageTitle('/nowhere')).toBe('لوحة التحكم');
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
    expect(labels(filterNav(ADMIN_NAV, 'التسويق'))).toEqual([['التسويق والعروض', 'الإشعارات التفاعلية', 'مكافآت الدعوة', 'البنرات', 'الكوبونات والقسائم', 'خصومات المنتجات']]);
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

describe('activeHref', () => {
  it('marks only the most specific page: /products/inactive is not also /products', () => {
    const hrefs = ['/products', '/products/inactive', '/orders'];
    expect(activeHref('/products/inactive', hrefs)).toBe('/products/inactive');
    expect(activeHref('/products/12', hrefs)).toBe('/products');
    expect(activeHref('/settings', hrefs)).toBeUndefined();
  });

  it('reads every page of the sidebar, in sections or alone', () => {
    const all = navHrefs(ADMIN_NAV);
    expect(all).toContain('/');
    expect(all).toContain('/products/inactive');
  });
});

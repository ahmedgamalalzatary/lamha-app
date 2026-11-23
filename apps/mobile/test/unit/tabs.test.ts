import { translate } from '@/core/i18n';
import { tabsForRole } from '@/core/navigation/tabs';

const labels = (role: Parameters<typeof tabsForRole>[0]) => tabsForRole(role).map((t) => translate(t.label));

describe('tabsForRole (one app, the role picks the tab bar: contract §2)', () => {
  it('customer: الرئيسية · السلة · طلباتي · حسابي (§6.3)', () => {
    expect(labels('customer')).toEqual(['الرئيسية', 'السلة', 'طلباتي', 'حسابي']);
  });

  it('partner: الرئيسية · طلباتى · منتجات · حسابي (§9)', () => {
    expect(labels('partner')).toEqual(['الرئيسية', 'طلباتى', 'منتجات', 'حسابي']);
  });

  it('driver: الرئيسية · الطلبات الحالية · حسابي (§10)', () => {
    expect(labels('driver')).toEqual(['الرئيسية', 'الطلبات الحالية', 'حسابي']);
  });

  it('admin: the accounts area (§11.2) and حسابي to sign out', () => {
    expect(labels('admin')).toEqual(['الحسابات', 'حسابي']);
  });

  it('gives every tab of a role its own route', () => {
    for (const role of ['customer', 'partner', 'driver', 'admin'] as const) {
      const names = tabsForRole(role).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

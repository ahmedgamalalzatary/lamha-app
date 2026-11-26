import { Bike, ChartLine, ClipboardList, House, type LucideIcon, Megaphone, Package, Settings, Store, UserRound, Users } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  /** A group without items is a page itself (الرئيسية). */
  href?: string;
  items: NavItem[];
}

/**
 * The admin sidebar, in Tawsilty's order and words (contract §11, admin/admin-orders-list-sidebar-status-tabs-flags.png).
 * الإعدادات is the contract's [Needed] section. The pages arrive with their phases.
 */
export const ADMIN_NAV: NavGroup[] = [
  { label: 'الرئيسية', icon: House, href: '/', items: [] },
  { label: 'الطلبات', icon: ClipboardList, items: [{ label: 'الطلبات', href: '/orders' }] },
  {
    label: 'العملاء',
    icon: Users,
    items: [
      // Phase 17: the list with each wallet, add and deduct (§11 A3, A5) [Open: layout ours].
      { label: 'العملاء', href: '/customers' },
      { label: 'الشكاوى والاقتراحات', href: '/customers/complaints' },
    ],
  },
  { label: 'الموردين', icon: Store, items: [{ label: 'الموردين', href: '/stores' }] },
  {
    label: 'المندوبين',
    icon: Bike,
    items: [
      { label: 'المندوبين', href: '/drivers' },
      // Phase 13: the global week and the shift, offer and skip numbers (§15.1 #5) [Open: name and layout ours].
      { label: 'نوبات العمل والقواعد', href: '/drivers/rules' },
    ],
  },
  {
    label: 'المنتجات والكتالوج',
    icon: Package,
    items: [
      { label: 'منتجات الموردين', href: '/products' },
      { label: 'منتجات غير فعالة', href: '/products/inactive' },
      // [Client] A12: not in the Tawsilty photo; the names are ours [Open].
      { label: 'أنواع الأكل', href: '/catalog/cuisines' },
      { label: 'مربعات الرئيسية', href: '/catalog/home-tiles' },
    ],
  },
  { label: 'التسويق والعروض', icon: Megaphone, items: [{ label: 'الإشعارات التفاعلية', href: '/marketing/notifications' }] },
  { label: 'التقارير', icon: ChartLine, items: [{ label: 'التقارير', href: '/reports' }] },
  {
    label: 'الإعدادات',
    icon: Settings,
    items: [
      // Phase 8: delivery zones (§8.9) [Open: name and layout ours].
      { label: 'المناطق', href: '/settings/zones' },
      // Phase 11: the delivery fee rule and who pays whom (§8.7) [Open: name and layout ours].
      { label: 'رسوم التوصيل والدفع', href: '/settings/delivery' },
      // Phase 15: the numbers "تواصل معنا" shows (§8.14) [Open: name and layout ours].
      { label: 'أرقام التواصل', href: '/settings/support' },
      { label: 'حسابات الإدارة', href: '/settings/admins' },
      // Review F70: who changed accounts, stores and zones [Open: not in Tawsilty's captures].
      { label: 'سجل التغييرات', href: '/settings/audit' },
    ],
  },
];

/**
 * The partner area (contract §11.1): same look as the admin sidebar, its own pages, no sections.
 * الحساب holds the profile and sign-out.
 */
export const PARTNER_NAV: NavGroup[] = [
  { label: 'الطلبات', icon: ClipboardList, href: '/partner/orders', items: [] },
  { label: 'المنتجات', icon: Package, href: '/partner/products', items: [] },
  { label: 'المتجر', icon: Store, href: '/partner/store', items: [] },
  { label: 'التقارير', icon: ChartLine, href: '/partner/reports', items: [] },
  { label: 'الحساب', icon: UserRound, href: '/partner/account', items: [] },
];

/** The page's name as the sidebar shows it, for its heading. */
export function pageTitle(pathname: string): string {
  for (const group of [...ADMIN_NAV, ...PARTNER_NAV]) {
    if (group.href === pathname) return group.label;
    const item = group.items.find((i) => i.href === pathname);
    if (item) return item.label;
  }
  return 'لوحة التحكم';
}

/** Folds the spellings people mix up when typing Arabic: أ/إ/آ → ا, ة → ه, ى → ي. */
function fold(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/** The sidebar search: a section whose name matches stays whole; otherwise only its matching pages stay. */
export function filterNav(groups: NavGroup[], query: string): NavGroup[] {
  const q = fold(query);
  if (!q) return groups;
  return groups.flatMap((group) => {
    if (fold(group.label).includes(q)) return [group];
    const items = group.items.filter((item) => fold(item.label).includes(q));
    return items.length ? [{ ...group, items }] : [];
  });
}

/** Whether the current path is this page or one of its sub-pages. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Every page the sidebar links to. */
export const navHrefs = (nav: NavGroup[]): string[] => nav.flatMap((g) => [...(g.href ? [g.href] : []), ...g.items.map((i) => i.href)]);

/** The one page to mark: the most specific match, so /products/inactive does not also mark /products. */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs.filter((href) => isActive(pathname, href)).sort((a, b) => b.length - a.length)[0];
}

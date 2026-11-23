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
  { label: 'العملاء', icon: Users, items: [{ label: 'الشكاوى والاقتراحات', href: '/customers/complaints' }] },
  { label: 'الموردين', icon: Store, items: [{ label: 'الموردين', href: '/stores' }] },
  { label: 'المندوبين', icon: Bike, items: [{ label: 'المندوبين', href: '/drivers' }] },
  {
    label: 'المنتجات والكتالوج',
    icon: Package,
    items: [
      { label: 'منتجات الموردين', href: '/products' },
      { label: 'منتجات غير فعالة', href: '/products/inactive' },
    ],
  },
  { label: 'التسويق والعروض', icon: Megaphone, items: [{ label: 'الإشعارات التفاعلية', href: '/marketing/notifications' }] },
  { label: 'التقارير', icon: ChartLine, items: [{ label: 'التقارير', href: '/reports' }] },
  { label: 'الإعدادات', icon: Settings, items: [{ label: 'حسابات الإدارة', href: '/settings/admins' }] },
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

import type { Role } from '@tawsela/shared';
import { Bike, ClipboardList, House, type LucideIcon, Package, ShoppingCart, User, Users } from 'lucide-react-native';
import type { TranslationKey } from '../i18n';

export interface TabSpec {
  /** The route file inside the role's folder. */
  name: string;
  label: TranslationKey;
  icon: LucideIcon;
}

const TABS: Record<Role, TabSpec[]> = {
  // Contract §6.3.
  customer: [
    { name: 'index', label: 'tabs.home', icon: House },
    { name: 'cart', label: 'tabs.cart', icon: ShoppingCart },
    { name: 'orders', label: 'tabs.orders', icon: ClipboardList },
    { name: 'account', label: 'tabs.account', icon: User },
  ],
  // Contract §9, from the partner app photos.
  partner: [
    { name: 'index', label: 'tabs.home', icon: House },
    { name: 'orders', label: 'tabs.partnerOrders', icon: ClipboardList },
    { name: 'products', label: 'tabs.products', icon: Package },
    { name: 'account', label: 'tabs.account', icon: User },
  ],
  // Contract §10, from the driver app screenshots.
  driver: [
    { name: 'index', label: 'tabs.home', icon: House },
    { name: 'current', label: 'tabs.currentOrders', icon: Bike },
    { name: 'account', label: 'tabs.account', icon: User },
  ],
  // Contract §11.2: an admin gets the accounts area, plus حسابي to sign out like every role.
  admin: [
    { name: 'index', label: 'tabs.accounts', icon: Users },
    { name: 'account', label: 'tabs.account', icon: User },
  ],
};

/** The tab bar for a signed-in account's role (contract §2: one app, four roles). */
export const tabsForRole = (role: Role): TabSpec[] => TABS[role];

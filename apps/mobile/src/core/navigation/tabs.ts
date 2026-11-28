import type { Role } from '@tawsela/shared';
import { Bike, ClipboardList, Home, type LucideIcon, Package, ReceiptText, ShoppingBag, UserRound, Users } from 'lucide-react-native';
import type { TranslationKey } from '../i18n';

export interface TabSpec {
  /** The route file inside the role's folder. */
  name: string;
  label: TranslationKey;
  icon: LucideIcon;
}

const TABS: Record<Role, TabSpec[]> = {
  // Contract §6.3; lamha's icons.
  customer: [
    { name: 'index', label: 'tabs.home', icon: Home },
    { name: 'cart', label: 'tabs.cart', icon: ShoppingBag },
    { name: 'orders', label: 'tabs.orders', icon: ReceiptText },
    { name: 'account', label: 'tabs.account', icon: UserRound },
  ],
  // Contract §9, from the partner app photos.
  partner: [
    { name: 'index', label: 'tabs.home', icon: Home },
    { name: 'orders', label: 'tabs.partnerOrders', icon: ClipboardList },
    { name: 'products', label: 'tabs.products', icon: Package },
    { name: 'account', label: 'tabs.account', icon: UserRound },
  ],
  // Contract §10, from the driver app screenshots.
  driver: [
    { name: 'index', label: 'tabs.home', icon: Home },
    { name: 'current', label: 'tabs.currentOrders', icon: Bike },
    { name: 'account', label: 'tabs.account', icon: UserRound },
  ],
  // Contract §11.2: an admin gets the accounts area, plus حسابي to sign out like every role.
  admin: [
    { name: 'index', label: 'tabs.accounts', icon: Users },
    { name: 'account', label: 'tabs.account', icon: UserRound },
  ],
};

/** The tab bar for a signed-in account's role (contract §2: one app, four roles). */
export const tabsForRole = (role: Role): TabSpec[] => TABS[role];

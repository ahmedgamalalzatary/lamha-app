import type { TranslationKey } from './ar';

// English, offered from the language switch (contract §7). Every Arabic key must exist here too.
export const en: Record<TranslationKey, string> = {
  'app.name': 'Tawsela',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.retry': 'Try again',
  'common.soon': 'Coming soon',
  'tabs.home': 'Home',
  'tabs.cart': 'Cart',
  'tabs.orders': 'My orders',
  'tabs.account': 'Account',
  'tabs.partnerOrders': 'Orders',
  'tabs.products': 'Products',
  'tabs.currentOrders': 'Current orders',
  'tabs.accounts': 'Accounts',
  'health.checking': 'Connecting to the server…',
  'health.ok': 'Connected to the server',
  'health.down': 'Could not reach the server',
  'health.version': 'Version {version}',
  'dev.title': 'App areas',
  'dev.customer': 'Customer',
  'dev.partner': 'Partner',
  'dev.driver': 'Driver',
  'dev.admin': 'Admin',
};

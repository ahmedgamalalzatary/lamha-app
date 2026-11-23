// Arabic, the default language (contract §7). Words follow Tawsilty.
export const ar = {
  'app.name': 'توصيلة',
  'common.cancel': 'إلغاء',
  'common.close': 'إغلاق',
  'common.retry': 'إعادة المحاولة',
  'common.soon': 'قريباً',
  'tabs.home': 'الرئيسية',
  'tabs.cart': 'السلة',
  'tabs.orders': 'طلباتي',
  'tabs.account': 'حسابي',
  'tabs.partnerOrders': 'طلباتى',
  'tabs.products': 'منتجات',
  'tabs.currentOrders': 'الطلبات الحالية',
  'tabs.accounts': 'الحسابات',
  'health.checking': 'جارٍ الاتصال بالخادم…',
  'health.ok': 'متصل بالخادم',
  'health.down': 'تعذر الاتصال بالخادم',
  'health.version': 'الإصدار {version}',
  'dev.title': 'واجهات التطبيق',
  'dev.customer': 'العميل',
  'dev.partner': 'المورد',
  'dev.driver': 'المندوب',
  'dev.admin': 'المدير',
} as const;

export type TranslationKey = keyof typeof ar;

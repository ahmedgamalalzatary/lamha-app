// الإشعارات and push (contract §8.14, §9, §10, §11 الإشعارات التفاعلية). Push goes through Expo's
// HTTP API (§15.1 #7). Which events push [Owner, 2026-11-25]: the customer's order status, the
// store's new order, a delivery man's new offer, his order ready, and the skip warning and block.
import type { CartMode } from './cart.js';
import type { OrderStatus } from './enums.js';
import { formatMoney, type Locale } from './format.js';

export const NOTICE_KINDS = [
  'order_accepted',
  'order_rejected',
  'order_ready',
  'order_on_way',
  'order_delivered',
  'order_picked_up',
  'new_order',
  'offer',
  'skip_warning',
  'skip_block',
  'driver_fine',
  'campaign',
] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export interface Notice {
  kind: NoticeKind;
  title: string;
  body: string;
}

type Texts = Record<Exclude<NoticeKind, 'campaign'>, Record<Locale, { title: string; body: string }>>;

/** [Open] Tawsilty's notification wording is not captured. {code}, {store}, {count}, {time} are filled in. */
const TEXTS: Texts = {
  order_accepted: { ar: { title: 'تم قبول طلبك', body: 'طلبك #{code} قيد التجهيز الآن' }, en: { title: 'Your order was accepted', body: 'Order #{code} is being prepared' } },
  order_rejected: { ar: { title: 'تم رفض طلبك', body: 'نعتذر، لم يتمكن المتجر من قبول طلبك #{code}' }, en: { title: 'Your order was declined', body: 'Sorry, the store could not accept order #{code}' } },
  order_ready: { ar: { title: 'الطلب جاهز', body: 'الطلب #{code} جاهز للاستلام من المتجر' }, en: { title: 'Order ready', body: 'Order #{code} is ready at the store' } },
  order_on_way: { ar: { title: 'طلبك في الطريق', body: 'طلبك #{code} خرج للتوصيل' }, en: { title: 'Your order is on its way', body: 'Order #{code} is out for delivery' } },
  order_delivered: { ar: { title: 'تم توصيل طلبك', body: 'بالهنا والشفا! كيف كان طلبك #{code}؟' }, en: { title: 'Your order was delivered', body: 'Enjoy! How was order #{code}?' } },
  order_picked_up: { ar: { title: 'تم استلام طلبك', body: 'بالهنا والشفا! كيف كان طلبك #{code}؟' }, en: { title: 'Order picked up', body: 'Enjoy! How was order #{code}?' } },
  new_order: { ar: { title: 'طلب جديد', body: 'وصلك طلب جديد #{code}' }, en: { title: 'New order', body: 'You have a new order #{code}' } },
  offer: { ar: { title: 'طلب جديد متاح', body: 'طلب #{code} من {store} متاح الآن' }, en: { title: 'New order available', body: 'Order #{code} from {store} is available' } },
  skip_warning: { ar: { title: 'تنبيه', body: 'تخطيت {count} طلبات متتالية. التخطي مرة أخرى يوقف حسابك مؤقتاً' }, en: { title: 'Warning', body: 'You skipped {count} orders in a row. One more pauses your account' } },
  skip_block: { ar: { title: 'تم إيقافك مؤقتاً', body: 'لن تصلك طلبات حتى {time}' }, en: { title: 'Paused', body: 'No offers until {time}' } },
  driver_fine: { ar: { title: 'خصم جديد', body: 'تم خصم {amount}: {reason}' }, en: { title: 'New deduction', body: '{amount} deducted: {reason}' } },
};

export function notice(kind: Exclude<NoticeKind, 'campaign'>, locale: Locale, params: Record<string, string> = {}): Notice {
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? '');
  const t = TEXTS[kind][locale];
  return { kind, title: fill(t.title), body: fill(t.body) };
}

/** The customer's push for a new status, or null for the steps that send none. */
export function customerStatusNotice(status: OrderStatus, mode: CartMode, code: string, locale: Locale): Notice | null {
  const kind: Exclude<NoticeKind, 'campaign'> | null =
    status === 'preparing'
      ? 'order_accepted'
      : status === 'rejected'
        ? 'order_rejected'
        : status === 'out_for_delivery'
          ? 'order_on_way'
          : status === 'delivered'
            ? mode === 'pickup'
              ? 'order_picked_up'
              : 'order_delivered'
            : status === 'ready' && mode === 'pickup'
              ? 'order_ready'
              : null;
  if (!kind) return null;
  const n = notice(kind, locale, { code });
  // A pickup's "ready" speaks to the customer, not to a delivery man [Derived].
  return kind === 'order_ready' ? { ...n, title: locale === 'ar' ? 'طلبك جاهز للاستلام' : 'Your order is ready', body: locale === 'ar' ? `طلبك #${code} جاهز، تفضل باستلامه` : `Order #${code} is ready to pick up` } : n;
}

/**
 * "تم قبول طلبك" for a pharmacy request (§8.11): it now carries the price the pharmacy set and the
 * total with the delivery [Open: Tawsilty's wording is not captured].
 */
export function requestPricedNotice(code: string, price: number, total: number, locale: Locale): Notice {
  const money = (n: number) => formatMoney(n, locale);
  return locale === 'ar'
    ? { kind: 'order_accepted', title: 'تم قبول طلبك', body: `سعر طلبك #${code} من الصيدلية ${money(price)}، والإجمالي مع التوصيل ${money(total)}` }
    : { kind: 'order_accepted', title: 'Your order was accepted', body: `The pharmacy priced order #${code} at ${money(price)}; ${money(total)} with the delivery` };
}

export const isExpoPushToken = (token: string) => /^Expo(nent)?PushToken\[.+\]$/.test(token);

/** POST /v1/me/push-tokens and DELETE /v1/me/push-tokens */
export interface PushTokenInput {
  token: string;
}

/** A row of الإشعارات. `path` is where tapping it goes in the app ("/order/12"). */
export interface AppNotification {
  id: number;
  kind: NoticeKind;
  title: string;
  body: string;
  path: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  items: AppNotification[];
  unread: number;
}

export const CAMPAIGN_TITLE_LIMIT = 80;
export const CAMPAIGN_BODY_LIMIT = 300;

/** POST /v1/admin/campaigns: sent now, to every customer or those with an address in one zone [Owner]. */
export interface CampaignInput {
  title: string;
  body: string;
  zoneId: number | null;
}

export interface Campaign {
  id: number;
  title: string;
  body: string;
  zone: { id: number; name: string } | null;
  recipients: number;
  sentBy: string;
  createdAt: string;
}

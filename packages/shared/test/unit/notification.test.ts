import { describe, expect, it } from 'vitest';
import { customerStatusNotice, isExpoPushToken, notice, requestPricedNotice } from '../../src/notification.js';

describe('notification texts (contract §8.14, §9, §10)', () => {
  it('tells the customer the steps they care about, in their language', () => {
    expect(customerStatusNotice('preparing', 'delivery', '506898', 'ar')).toEqual({ kind: 'order_accepted', title: 'تم قبول طلبك', body: 'طلبك #506898 قيد التجهيز الآن' });
    expect(customerStatusNotice('out_for_delivery', 'delivery', '506898', 'en')?.title).toBe('Your order is on its way');
    expect(customerStatusNotice('delivered', 'delivery', '506898', 'ar')?.title).toBe('تم توصيل طلبك');
    expect(customerStatusNotice('rejected', 'delivery', '506898', 'ar')?.title).toBe('تم رفض طلبك');
  });

  it('a pickup is ready to pick up and then picked up; "ready" for a delivery says nothing', () => {
    expect(customerStatusNotice('ready', 'pickup', '1', 'ar')?.title).toBe('طلبك جاهز للاستلام');
    expect(customerStatusNotice('delivered', 'pickup', '1', 'ar')?.title).toBe('تم استلام طلبك');
    expect(customerStatusNotice('ready', 'delivery', '1', 'ar')).toBeNull();
    expect(customerStatusNotice('pending_review', 'delivery', '1', 'ar')).toBeNull();
  });

  it('words the store\'s, the delivery man\'s and the skip notices', () => {
    expect(notice('new_order', 'ar', { code: '506898' })).toEqual({ kind: 'new_order', title: 'طلب جديد', body: 'وصلك طلب جديد #506898' });
    expect(notice('offer', 'ar', { code: '506898', store: 'بطاطس' }).body).toBe('طلب #506898 من بطاطس متاح الآن');
    expect(notice('order_ready', 'en', { code: '506898' }).title).toBe('Order ready');
    expect(notice('skip_warning', 'ar', { count: '2' }).body).toContain('2');
    expect(notice('skip_block', 'ar', { time: '9:15 PM' }).body).toContain('9:15 PM');
  });

  it('recognises an Expo push token', () => {
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc]')).toBe(true);
    expect(isExpoPushToken('fcm-token')).toBe(false);
  });

  it('tells the customer the price a pharmacy set on their request (§8.11)', () => {
    expect(requestPricedNotice('100012', 120, 133, 'ar')).toEqual({
      kind: 'order_accepted',
      title: 'تم قبول طلبك',
      body: 'سعر طلبك #100012 من الصيدلية 120.00 ج.م، والإجمالي مع التوصيل 133.00 ج.م',
    });
    expect(requestPricedNotice('100012', 120, 133, 'en').body).toBe('The pharmacy priced order #100012 at 120.00 EGP; 133.00 EGP with the delivery');
  });
});

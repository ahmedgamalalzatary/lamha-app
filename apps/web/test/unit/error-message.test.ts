import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/core/api/create-api';
import { errorMessage } from '@/core/api/error-message';

describe('errorMessage (the API sends a code, the dashboard shows Arabic: contract §7)', () => {
  it('translates the sign-in codes with the same words as the app', () => {
    expect(errorMessage(new ApiRequestError(401, 'x', 'BAD_CREDENTIALS'))).toBe('رقم الهاتف أو كلمة المرور غير صحيحة');
    expect(errorMessage(new ApiRequestError(403, 'x', 'ACCOUNT_DISABLED'))).toBe('هذا الحساب موقوف، تواصل مع الإدارة');
    expect(errorMessage(new ApiRequestError(403, 'x', 'DASHBOARD_ROLE'))).toBe('لوحة التحكم للإدارة والمطاعم فقط، استخدم التطبيق');
  });

  it('translates the account-management codes', () => {
    expect(errorMessage(new ApiRequestError(409, 'x', 'PHONE_TAKEN'))).toBe('رقم الهاتف مسجل بالفعل');
    expect(errorMessage(new ApiRequestError(400, 'x', 'OWN_ACCOUNT'))).toBe('لا يمكنك تغيير حسابك من هنا، اطلب ذلك من مسؤول آخر');
    expect(errorMessage(new ApiRequestError(400, 'x', 'LAST_ADMIN'))).toBe('يجب أن يبقى مسؤول واحد مفعّل على الأقل');
  });

  it('explains a network failure and the rate limit', () => {
    expect(errorMessage(new ApiRequestError(0, 'fetch failed'))).toBe('تعذر الاتصال بالخادم');
    expect(errorMessage(new ApiRequestError(429, 'ThrottlerException'))).toBe('محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى');
  });

  it('falls back to a general sentence', () => {
    expect(errorMessage(new ApiRequestError(500, 'boom'))).toBe('حدث خطأ، حاول مرة أخرى');
    expect(errorMessage(new Error('x'))).toBe('حدث خطأ، حاول مرة أخرى');
  });
});

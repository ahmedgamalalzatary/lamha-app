import { isRTL, translate } from '@/core/i18n';

describe('translate', () => {
  it('speaks Arabic by default', () => {
    expect(translate('tabs.home')).toBe('الرئيسية');
  });

  it('speaks English when asked', () => {
    expect(translate('tabs.home', 'en')).toBe('Home');
  });

  it('fills {placeholders}', () => {
    expect(translate('errors.OTP_WRONG', 'ar', { tries: 3 })).toBe('الرمز غير صحيح، متبقي 3 محاولات');
  });
});

describe('isRTL', () => {
  it('is right-to-left for Arabic only', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
  });
});

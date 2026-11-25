import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRTL, translate } from '@/core/i18n';
import { localePreference } from '@/core/i18n/locale';
import { prepareDirectionReload } from '@/core/i18n/native-direction';

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

it('bounds automatic native reloads until the device reports the requested direction', async () => {
  await prepareDirectionReload('ar', true);
  expect(await prepareDirectionReload('ar', false)).toBe(true);
  expect(await prepareDirectionReload('ar', false)).toBe(false);
  await prepareDirectionReload('ar', true);
  expect(await prepareDirectionReload('ar', false)).toBe(true);
  await prepareDirectionReload('ar', true);
});

it('keeps the last device language when a write finishes after its session changed', async () => {
  await localePreference.save('ar');
  const write = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  let begin!: () => void;
  let complete!: () => void;
  const started = new Promise<void>((resolve) => { begin = resolve; });
  const waiting = new Promise<void>((resolve) => { complete = resolve; });
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
    begin();
    await waiting;
    await write(key, value);
  });
  let current = true;
  const pending = localePreference.save('en', () => current);
  await started;
  current = false;
  complete();
  await pending;
  expect(localePreference.current()).toBe('ar');
  expect(await AsyncStorage.getItem('tawsela.locale')).toBe('ar');
});

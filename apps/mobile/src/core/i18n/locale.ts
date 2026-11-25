import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@tawsela/shared';
import { create } from 'zustand';

export const DEFAULT_LOCALE: Locale = 'ar';
const LOCALE_KEY = 'tawsela.locale';
const usePreference = create<{ locale: Locale }>(() => ({ locale: DEFAULT_LOCALE }));

export const useLocale = () => usePreference((state) => state.locale);
export const isRTL = (locale: Locale) => locale === 'ar';
export const useTextStart = () => isRTL(useLocale()) ? 'right' : 'left';

export const localePreference = {
  current: () => usePreference.getState().locale,

  async restore(profileLocale?: Locale): Promise<void> {
    const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
    if (profileLocale && profileLocale !== stored) {
      // The profile is still usable when the device cannot write its local copy.
      await localePreference.save(profileLocale).catch(() => usePreference.setState({ locale: profileLocale }));
      return;
    }
    usePreference.setState({ locale: stored === 'en' ? 'en' : DEFAULT_LOCALE });
  },

  async save(locale: Locale): Promise<void> {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
    usePreference.setState({ locale });
  },
};

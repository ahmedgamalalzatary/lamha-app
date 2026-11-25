import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@tawsela/shared';
import { create } from 'zustand';

export const DEFAULT_LOCALE: Locale = 'ar';
const LOCALE_KEY = 'tawsela.locale';
const usePreference = create<{ locale: Locale; persisted: boolean }>(() => ({ locale: DEFAULT_LOCALE, persisted: true }));
let pending: Promise<void> = Promise.resolve();

export const useLocale = () => usePreference((state) => state.locale);
export const useLocalePersisted = () => usePreference((state) => state.persisted);
export const isRTL = (locale: Locale) => locale === 'ar';
export const useTextStart = () => isRTL(useLocale()) ? 'right' : 'left';

const always = () => true;

/** Serialize reads, writes and rollback so late work cannot overwrite a newer account's locale. */
function apply(preferred: Locale | undefined, current: () => boolean): Promise<void> {
  const work = pending.then(async () => {
    if (!current()) return;
    const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
    if (!current()) return;
    const locale = preferred ?? (stored === 'en' ? 'en' : DEFAULT_LOCALE);
    const changed = preferred !== undefined && preferred !== stored;
    const persisted = !changed || await AsyncStorage.setItem(LOCALE_KEY, locale).then(() => true, () => false);
    if (!current()) {
      if (changed && persisted) {
        await (stored === null ? AsyncStorage.removeItem(LOCALE_KEY) : AsyncStorage.setItem(LOCALE_KEY, stored)).catch(() => undefined);
      }
    } else {
      usePreference.setState({ locale, persisted });
    }
  });
  pending = work.catch(() => undefined);
  return work;
}

export const localePreference = {
  current: () => usePreference.getState().locale,
  restore: (profileLocale?: Locale, current = always) => apply(profileLocale, current),
  save: (locale: Locale, current = always) => apply(locale, current),
};

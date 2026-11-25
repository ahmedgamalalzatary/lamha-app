import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@tawsela/shared';

const ATTEMPT_KEY = 'tawsela.directionReload';

/** A restart gets one attempt across JS runtimes, until native direction matches again. */
export async function prepareDirectionReload(locale: Locale, matches: boolean): Promise<boolean> {
  const attempted = await AsyncStorage.getItem(ATTEMPT_KEY);
  if (matches) {
    if (attempted !== null) await AsyncStorage.removeItem(ATTEMPT_KEY);
    return false;
  }
  if (attempted === locale) return false;
  await AsyncStorage.setItem(ATTEMPT_KEY, locale);
  return true;
}

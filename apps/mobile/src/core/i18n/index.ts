import type { Locale } from '@tawsela/shared';
import { ar, type TranslationKey } from './ar';
import { en } from './en';
import { DEFAULT_LOCALE, useLocale } from './locale';

export type { TranslationKey };
export { DEFAULT_LOCALE, isRTL, useLocale, useTextStart } from './locale';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ar, en };

export function translate(key: TranslationKey, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>) {
  const text = dictionaries[locale][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** The translate function for the current language. */
export function useT() {
  const locale = useLocale();
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(key, locale, params);
}

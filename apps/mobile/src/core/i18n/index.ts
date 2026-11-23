import type { Locale } from '@tawsela/shared';
import { ar, type TranslationKey } from './ar';
import { en } from './en';

export type { TranslationKey };

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ar, en };

/** Arabic is the default (contract §7). The language switch arrives with the account screen. */
export const DEFAULT_LOCALE: Locale = 'ar';

export function translate(key: TranslationKey, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>) {
  const text = dictionaries[locale][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export const isRTL = (locale: Locale) => locale === 'ar';

/** The translate function for the current language. */
export function useT() {
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(key, DEFAULT_LOCALE, params);
}

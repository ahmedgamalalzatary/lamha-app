import { type TranslationKey, translate } from '../i18n';
import { ar } from '../i18n/ar';
import { localePreference } from '../i18n/locale';
import { ApiRequestError } from './client';

/** The sentence to show for a failed call, in the app's language (the API sends a code, §7). */
export function errorMessage(e: unknown): string {
  const locale = localePreference.current();
  if (!(e instanceof ApiRequestError)) return translate('errors.generic', locale);
  if (e.status === 0) return translate('errors.network', locale);
  const key = `errors.${e.code}` as TranslationKey;
  if (!e.code || !(key in ar)) return translate('errors.generic', locale);
  return translate(key, locale, { seconds: e.retryIn ?? 0, tries: e.triesLeft ?? 0 });
}

import { type TranslationKey, translate } from '../i18n';
import { ar } from '../i18n/ar';
import { ApiRequestError } from './client';

/** The sentence to show for a failed call, in the app's language (the API sends a code, §7). */
export function errorMessage(e: unknown): string {
  if (!(e instanceof ApiRequestError)) return translate('errors.generic');
  if (e.status === 0) return translate('errors.network');
  const key = `errors.${e.code}` as TranslationKey;
  if (!e.code || !(key in ar)) return translate('errors.generic');
  return translate(key, undefined, { seconds: e.retryIn ?? 0, tries: e.triesLeft ?? 0 });
}

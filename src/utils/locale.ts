import type { Locale } from '../domain/types.js';

type LocaleSupport = (locales: string[]) => string[];

/**
 * Keep reports usable in Node builds shipped without French ICU data.
 * The configured locale is preserved in the report metadata; only rendering falls back.
 */
export function resolveDisplayLocale(
  requested: Locale,
  supportedLocales: LocaleSupport = (locales) => Intl.DateTimeFormat.supportedLocalesOf(locales),
): Locale {
  return requested === 'fr' && supportedLocales(['fr']).length === 0 ? 'en' : requested;
}

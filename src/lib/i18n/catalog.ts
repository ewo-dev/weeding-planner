import type { Locale } from './types'
import { fr, type Messages } from './fr'
import { en } from './en'
import { es } from './es'

export type { Locale, Messages }
export { fr }

export const messages: Record<Locale, Messages> = { fr, en, es }

export const locales: readonly Locale[] = ['fr', 'en', 'es']

export const defaultLocale: Locale = 'fr'

/** Returns the catalog for a locale, falling back to French for unknown locales. */
export function getMessages(locale: Locale = defaultLocale): Messages {
  return messages[locale] ?? fr
}

/** Builds a locale-prefixed path (`localePrefix: 'always'`). */
export function localePath(locale: Locale, path: string): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

// Minimal message formatting: replaces `{name}`-style placeholders with the
// matching param value. Unknown placeholders are left as-is.
export function format(
  message: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

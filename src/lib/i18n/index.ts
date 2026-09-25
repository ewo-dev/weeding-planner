import type { Locale } from './types'
import { fr, type Messages } from './fr'

export type { Locale, Messages }
export { fr }

export const messages: Record<Locale, Messages> = { fr }

// Returns the messages for the current locale. The MVP ships French only
// (D-011); a future locale switch (route prefix or cookie) returns
// `messages[locale]` here instead of the hardcoded `fr`.
export function useMessages(): Messages {
  return fr
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

import { defineRouting } from 'next-intl/routing'
import type { Locale } from './types'

// Locale routing for a static export: every locale is prefixed (`/fr`, `/en`,
// `/es`) because a proxy/middleware cannot negotiate the locale on the server
// (docs/08-decisions.md D-019). French is the fallback default.
export const routing = defineRouting({
  locales: ['fr', 'en', 'es'] as Locale[],
  defaultLocale: 'fr',
  localePrefix: 'always',
})

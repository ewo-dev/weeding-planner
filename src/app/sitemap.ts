import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { locales } from '@/lib/i18n/catalog'

export const dynamic = 'force-static'

// Only the public home page is search-facing (docs/06-routing-and-pages.md
// § 12). Editor and print routes are private and excluded. One entry per
// localized home page.
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
  }))
}

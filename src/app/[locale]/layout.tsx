import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { SITE_URL, SITE_NAME } from '@/lib/site'
import { LocaleProvider } from '@/lib/i18n'
import { getMessages } from '@/lib/i18n/catalog'
import type { Locale } from '@/lib/i18n/catalog'
import { routing } from '@/lib/i18n/routing'
import '../../styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const OG_LOCALE: Record<Locale, string> = {
  fr: 'fr_FR',
  en: 'en_US',
  es: 'es_ES',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = getMessages(locale as Locale)
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.meta.title,
      template: '%s — My Weeding Seats',
    },
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        en: '/en',
        es: '/es',
      },
    },
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale as Locale],
      url: `/${locale}`,
      siteName: SITE_NAME,
      title: t.meta.title,
      description: t.meta.description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: t.meta.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
      images: ['/og-image.png'],
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = getMessages(locale as Locale)

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        {/* Skip link (docs/09-design-system.md § 15): first tab stop on every page. */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[120] focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          {t.a11y.skipToContent}
        </a>
        <LocaleProvider locale={locale as Locale}>
          <ToastProvider>
            <div id="contenu">{children}</div>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import { ToastProvider } from '@/components/ui/ToastProvider'
import '../styles/globals.css'

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

export const metadata: Metadata = {
  title: 'Plan de Table',
  description: 'Plan de table pour votre mariage',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        {/* Skip link (docs/09-design-system.md § 15): first tab stop on every page. */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[120] focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          Aller au contenu
        </a>
        <ToastProvider>
          <div id="contenu">{children}</div>
        </ToastProvider>
      </body>
    </html>
  )
}

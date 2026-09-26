import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getMessages } from '@/lib/i18n/catalog'
import type { Locale } from '@/lib/i18n/catalog'

// Private app surface (docs/06-routing-and-pages.md § 12): excluded from
// search indexing. The editor holds browser-local plan data only.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: getMessages(locale as Locale).editor.pageTitle,
    robots: { index: false, follow: false },
  }
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

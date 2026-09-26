'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { useMessages } from '@/lib/i18n'

// Localized 404 (docs/06-routing-and-pages.md § 8). Falls back to French
// when rendered outside a locale (e.g. an unknown locale prefix).
export default function NotFound() {
  const t = useMessages()
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        title={t.notFound.title}
        description={t.notFound.description}
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-text-inverse shadow-sm transition-all hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t.notFound.back}
          </Link>
        }
      />
    </main>
  )
}

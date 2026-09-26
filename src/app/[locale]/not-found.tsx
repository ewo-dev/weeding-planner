import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { fr } from '@/lib/i18n'

// Generic 404 (docs/06-routing-and-pages.md § 8), pre-rendered at build time.
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        title={fr.notFound.title}
        description={fr.notFound.description}
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-text-inverse shadow-sm transition-all hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {fr.notFound.back}
          </Link>
        }
      />
    </main>
  )
}

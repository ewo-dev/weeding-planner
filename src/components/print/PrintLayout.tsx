'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface PrintLayoutProps {
  planName: string
  unseatedNames: string[]
  seatedCount: number
  totalGuests: number
  /** One <PrintTable> per table. */
  children: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

/**
 * Print view shell (docs/06-routing-and-pages.md § 7, D-017). Screen-only
 * controls (back + print buttons) hide via `print:hidden`; `print.css`
 * forces black on white and strips backgrounds for ink savings. The browser
 * print dialog doubles as PDF export.
 */
export function PrintLayout({ planName, unseatedNames, seatedCount, totalGuests, children }: PrintLayoutProps) {
  const router = useRouter()

  return (
    <main className="print-sheet mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => router.push('/editor')}
          className="rounded border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface"
        >
          ← Retour à l’éditeur
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Imprimer
        </button>
      </div>

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">{planName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Imprimé le {dateFormatter.format(new Date())} · {seatedCount} / {totalGuests} invités placés
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">{children}</div>

      {unseatedNames.length > 0 && (
        <section aria-label="Non placés" className="mt-6 break-inside-avoid rounded-lg border border-border p-4">
          <h2 className="font-display text-base font-semibold text-text">
            Non placés ({unseatedNames.length})
          </h2>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-text">
            {unseatedNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

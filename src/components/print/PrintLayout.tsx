'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BotanicalDivider } from '@/components/ui/BotanicalDivider'

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
    <main className="print-sheet mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button type="button" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/editor')}>
          Retour à l’éditeur
        </Button>
        <Button type="button" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>

      <header className="text-center sm:text-left">
        <h1 className="font-display text-3xl font-semibold text-text">{planName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Imprimé le {dateFormatter.format(new Date())} · {seatedCount} / {totalGuests} invités placés
        </p>
      </header>

      <BotanicalDivider className="my-6 print:hidden" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">{children}</div>

      {unseatedNames.length > 0 && (
        <section aria-label="Non placés" className="mt-6 break-inside-avoid rounded-xl border border-border bg-surface p-4 shadow-sm">
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

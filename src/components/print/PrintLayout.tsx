'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Assignment, Guest, Plan, Table } from '@/types/plan'
import { Button } from '@/components/ui/Button'
import { BotanicalDivider } from '@/components/ui/BotanicalDivider'
import { useMessages, useLocale, format, localePath } from '@/lib/i18n'

interface PrintLayoutProps {
  plan: Plan
  /** One <PrintTable> per table. */
  children: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })
const collator = new Intl.Collator('fr', { sensitivity: 'base' })

interface IndexEntry {
  guest: Guest
  table: Table | null
  seatIndex: number | null
}

/**
 * Print view shell (docs/06-routing-and-pages.md § 7, roadmap step 20,
 * docs/01-product.md § 16). Paper-first output for A4 portrait: header,
 * one block per table, unseated section, and an alphabetical guest index
 * mapping each guest to their table. Screen-only controls hide via
 * `print:hidden`; `print.css` forces black on white and strips chrome for
 * ink savings. The browser print dialog doubles as PDF export.
 */
export function PrintLayout({ plan, children }: PrintLayoutProps) {
  const router = useRouter()
  const t = useMessages()
  const locale = useLocale()
  const seatedCount = plan.assignments.length
  const totalGuests = plan.guests.length
  const unseatedCount = totalGuests - seatedCount

  const index: IndexEntry[] = plan.guests
    .map((guest) => {
      const assignment: Assignment | undefined = plan.assignments.find((a) => a.guestId === guest.id)
      const table = assignment ? plan.tables.find((t) => t.id === assignment.tableId) ?? null : null
      return { guest, table, seatIndex: assignment?.seatIndex ?? null }
    })
    .sort((a, b) => collator.compare(a.guest.name, b.guest.name))

  return (
    <main className="print-sheet mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button type="button" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push(localePath(locale, '/editor'))}>
          {t.print.backToEditor}
        </Button>
        <Button type="button" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
          {t.common.print}
        </Button>
      </div>

      <header className="text-center sm:text-left">
        <h1 className="font-display text-3xl font-semibold text-text">{plan.meta.name}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {format(t.print.printedOn, { date: dateFormatter.format(new Date()), seated: seatedCount, total: totalGuests })}
        </p>
        {unseatedCount > 0 && (
          <p className="mt-0.5 text-sm text-text-muted">
            {unseatedCount === 1 ? t.print.unseatedOne : format(t.print.unseatedMany, { n: unseatedCount })}
          </p>
        )}
      </header>

      <BotanicalDivider className="my-6 print:hidden" />

      <div className="mt-6 flex flex-col gap-4">{children}</div>

      {unseatedCount > 0 && (
        <section aria-label={t.print.unseatedSection} className="mt-8 break-inside-avoid rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="font-display text-base font-semibold text-text">
            {format(t.print.unseatedCount, { n: unseatedCount })}
          </h2>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-text">
            {plan.guests
              .filter((guest) => !plan.assignments.some((a) => a.guestId === guest.id))
              .sort((a, b) => collator.compare(a.name, b.name))
              .map((guest) => (
                <li key={guest.id}>{guest.name}</li>
              ))}
          </ul>
        </section>
      )}

      <section aria-label={t.print.indexSection} className="mt-8 break-inside-avoid rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="font-display text-base font-semibold text-text">{t.print.indexSection}</h2>
        {index.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t.print.noGuests}</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-text sm:grid-cols-2">
            {index.map(({ guest, table, seatIndex }) => (
              <li key={guest.id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{guest.name}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {table ? (
                    <>
                      {table.name}
                      {seatIndex !== null ? ` · ${format(t.print.placeLabel, { n: seatIndex + 1 })}` : ''}
                    </>
                  ) : (
                    t.print.unplaced
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/types/plan'
import { getRepository } from '@/lib/repo'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { PrintLayout } from '@/components/print/PrintLayout'
import { PrintTable } from '@/components/print/PrintTable'
import { Button } from '@/components/ui/Button'
import { useMessages, useLocale, localePath } from '@/lib/i18n'
import '../../../styles/print.css'

// Print view (docs/06-routing-and-pages.md § 7, roadmap step 20, D-019).
// Reads the active plan id from localStorage, loads it via the repository,
// and renders the print-friendly layout. Fully client for the static
// export: no loading.tsx / error.tsx, no metadata (client components
// cannot export it).

export default function PrintPage() {
  const router = useRouter()
  const t = useMessages()
  const locale = useLocale()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const activeId = localStorage.getItem(ACTIVE_PLAN_KEY)
    if (!activeId) {
      router.replace(localePath(locale, '/'))
      return
    }
    getRepository()
      .load(activeId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          router.replace(localePath(locale, '/'))
          return
        }
        setPlan(loaded)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('Failed to load the active plan for printing', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      })
    return () => {
      cancelled = true
    }
  }, [router, attempt, locale])

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="font-display text-xl font-semibold text-text">
            {t.common.loadFailedTitle}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}>
              {t.common.retry}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.replace(localePath(locale, '/'))}>
              {t.common.back}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!plan) return null

  return (
    <PrintLayout plan={plan}>
      {plan.tables.map((table) => (
        <PrintTable key={table.id} table={table} guests={plan.guests} assignments={plan.assignments} />
      ))}
    </PrintLayout>
  )
}

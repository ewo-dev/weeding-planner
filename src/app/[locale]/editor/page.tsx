'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import type { Plan } from '@/types/plan'
import { getRepository } from '@/lib/repo'
import { PlanProvider } from '@/lib/plan/context'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { EditorSkeleton } from '@/components/layout/EditorSkeleton'
import { TopBar } from '@/components/layout/TopBar'
import { PlanStatsBar } from '@/components/plan-status/PlanStatsBar'
import { SeatingEditor } from '@/components/editor/SeatingEditor'
import { Button } from '@/components/ui/Button'
import { useMessages, useLocale, localePath } from '@/lib/i18n'

// Editor route (docs/06-routing-and-pages.md § 6). Reads the active plan id
// from localStorage, loads it via the repository, and mounts the editor
// subtree inside <PlanProvider>. Loading and error states are rendered inline
// by this client component (no loading.tsx / error.tsx in static export).

export default function EditorPage() {
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
        console.error('Failed to load the active plan', err)
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
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

  if (!plan) return <EditorSkeleton />

  // SeatingEditor owns the DnD context and the editor layout (side panel +
  // canvas) inside it (docs/10-interactions.md § 3).
  return (
    <PlanProvider initialPlan={plan}>
      <TopBar />
      <PlanStatsBar />
      <SeatingEditor />
    </PlanProvider>
  )
}

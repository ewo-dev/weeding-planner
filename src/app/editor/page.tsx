'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/types/plan'
import { getRepository } from '@/lib/repo'
import { PlanProvider } from '@/lib/plan/context'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { EditorSkeleton } from '@/components/layout/EditorSkeleton'
import { TopBar } from '@/components/layout/TopBar'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { PlanStatsBar } from '@/components/plan-status/PlanStatsBar'

// Editor route (docs/06-routing-and-pages.md § 6). Reads the active plan id
// from localStorage, loads it via the repository, and mounts the editor
// subtree inside <PlanProvider>. Loading and error states are rendered inline
// by this client component (no loading.tsx / error.tsx in static export).

export default function EditorPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const activeId = localStorage.getItem(ACTIVE_PLAN_KEY)
    if (!activeId) {
      router.replace('/')
      return
    }
    getRepository()
      .load(activeId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          router.replace('/')
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
  }, [router, attempt])

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-danger">
          Le plan n&apos;a pas pu être chargé. Réessayer ?
        </h1>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="underline"
            onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}
          >
            Réessayer
          </button>
          <button type="button" className="underline" onClick={() => router.replace('/')}>
            Retour à l&apos;accueil
          </button>
        </div>
      </main>
    )
  }

  if (!plan) return <EditorSkeleton />

  return (
    <PlanProvider initialPlan={plan}>
      <TopBar />
      <PlanStatsBar />
      <EditorLayout>
        {/* Placeholder for the seating editor canvas (step 10). */}
        <div className="rounded border border-dashed border-border p-8 text-center text-sm text-text-muted">
          L&apos;éditeur de plan arrive à l&apos;étape suivante (étape 10).
        </div>
      </EditorLayout>
    </PlanProvider>
  )
}
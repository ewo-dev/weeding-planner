'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/types/plan'
import { getRepository } from '@/lib/repo'
import { PlanProvider } from '@/lib/plan/context'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { EditorSkeleton } from '@/components/layout/EditorSkeleton'
import { TopBar } from '@/components/layout/TopBar'
import { PlanStatsBar } from '@/components/plan-status/PlanStatsBar'
import { SeatingEditor } from '@/components/editor/SeatingEditor'

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
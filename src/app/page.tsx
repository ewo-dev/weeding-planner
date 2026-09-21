'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { PlanList } from '@/components/layout/PlanList'
import { ProjectActions } from '@/components/persistence/ProjectActions'
import { createBlankPlan } from '@/components/layout/createBlankPlan'
import { getRepository } from '@/lib/repo'
import type { PlanSummary } from '@/lib/repo/types'

export default function HomePage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<PlanSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getRepository()
      .list()
      .then((list) => {
        if (cancelled) return
        setSummaries(list)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('Failed to list plans', err)
        setListError('Impossible de charger vos plans. Réessayez.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  async function handleCreate(): Promise<void> {
    setCreating(true)
    setCreateError(null)
    try {
      await createBlankPlan()
      router.push('/editor')
    } catch (err) {
      console.error('Failed to create a blank plan', err)
      setCreateError('Impossible de créer un plan. Réessayez.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Plan de Table</h1>
        <p className="mt-1 text-text-muted">Créez votre plan de table</p>
      </header>

      <Button
        type="button"
        onClick={() => void handleCreate()}
        loading={creating}
        className="w-full sm:w-auto"
      >
        Nouveau plan
      </Button>

      <div className="mt-3">
        <ProjectActions onImported={reload} />
      </div>

      {createError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {createError}
        </p>
      )}

      {status === 'loading' && (
        <div className="mt-10 flex justify-center text-text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="mt-10 rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-text">{listError}</p>
          <Button type="button" variant="secondary" onClick={reload} className="mt-3">
            Réessayer
          </Button>
        </div>
      )}

      {status === 'ready' && summaries.length === 0 && (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="font-medium text-text">Aucun plan pour l&apos;instant</p>
          <p className="mt-1 text-sm text-text-muted">
            Créez votre premier plan de table pour commencer.
          </p>
        </div>
      )}

      {status === 'ready' && summaries.length > 0 && (
        <PlanList summaries={summaries} onChanged={reload} />
      )}
    </main>
  )
}
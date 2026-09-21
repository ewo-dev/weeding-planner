'use client'

import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getRepository } from '@/lib/repo'
import { RepoError } from '@/lib/repo/errors'
import type { Plan } from '@/types/plan'
import type { PlanAction } from './actions'
import { planReducer } from './reducer'
import type { PlanHistoryState } from './reducer'

/** Autosave debounce after the last mutation (docs/05-persistence.md § 4). */
const AUTOSAVE_DELAY = 500

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface PlanContextValue {
  plan: Plan
  dispatch: (action: PlanAction) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveStatus: SaveStatus
  saveError: RepoError | null
}

export const PlanContext = createContext<PlanContextValue | null>(null)

function createInitialState(initialPlan: Plan): PlanHistoryState {
  return { plan: initialPlan, past: [], future: [], lastSavedAt: null }
}

/**
 * Single source of truth for the open plan (docs/02-architecture.md § 7-8).
 * All mutations flow through the reducer; the repository autosaves the latest
 * plan with a 500 ms debounce, immediately on `beforeunload`, and immediately
 * before auto-generation (docs/05-persistence.md § 4).
 */
export function PlanProvider({ initialPlan, children }: { initialPlan: Plan; children: ReactNode }) {
  const [state, rawDispatch] = useReducer(planReducer, initialPlan, createInitialState)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<RepoError | null>(null)

  const latestPlanRef = useRef(state.plan)

  // Keep the ref in sync after each commit (refs must not be written during render).
  useEffect(() => {
    latestPlanRef.current = state.plan
  }, [state.plan])

  const save = useCallback(
    async (planToSave: Plan): Promise<void> => {
      setSaveStatus('saving')
      try {
        await getRepository().save(planToSave)
        setSaveStatus('saved')
        setSaveError(null)
        rawDispatch({ type: 'markSaved', at: new Date().toISOString() })
      } catch (err) {
        setSaveStatus('error')
        setSaveError(err instanceof RepoError ? err : new RepoError('unknown', 'Failed to save plan', err))
      }
    },
    [rawDispatch],
  )

  const dispatch = useCallback(
    (action: PlanAction) => {
      if (action.type === 'generateSeating' && typeof window !== 'undefined') {
        // Immediate save of the pre-generation baseline (docs/05-persistence.md § 4):
        // the reducer replaces assignments synchronously, so the engine-rendered
        // state is picked up by the debounced autosave right after.
        void save(latestPlanRef.current)
      }
      rawDispatch(action)
    },
    [rawDispatch, save],
  )

  // Debounced autosave: a new plan reference clears and restarts the timer.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setTimeout(() => {
      void save(latestPlanRef.current)
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [save, state.plan])

  // Flush any pending save synchronously when the page unloads. The local
  // repository performs all writes before its promise resolves, so invoking it
  // here without awaiting persists the latest plan. Errors are swallowed (the
  // page is going away anyway).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onBeforeUnload = (): void => {
      void save(latestPlanRef.current)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [save])

  const value = useMemo<PlanContextValue>(
    () => ({
      plan: state.plan,
      dispatch,
      undo: () => rawDispatch({ type: 'undo' }),
      redo: () => rawDispatch({ type: 'redo' }),
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      saveStatus,
      saveError,
    }),
    [state.plan, state.past.length, state.future.length, dispatch, saveStatus, saveError],
  )

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}
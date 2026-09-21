'use client'

import { useContext } from 'react'
import { PlanContext } from './context'
import type { PlanContextValue } from './context'

/** Typed access to the plan context. Throws when used outside <PlanProvider>. */
export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext)
  if (!context) throw new Error('usePlan must be used within a <PlanProvider>')
  return context
}
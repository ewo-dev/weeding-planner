'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ConstraintRef } from '@/lib/engine'
import { usePlan } from '@/lib/plan/usePlan'
import { conflicts } from '@/lib/plan/selectors'
import { useToast } from '@/components/ui/ToastProvider'
import { resolutionMessage, violationKey, violationMessage } from './constraints'

/**
 * Conflict reporting after manual edits (docs/10-interactions.md § 14).
 * Recomputes `detectConflicts(plan)` on every dispatch and toasts:
 * - fresh mandatory violations → warning with `Annuler` (undo) + `Garder`
 *   (dismiss); the move itself always stands.
 * - resolved violations → soft success toast.
 *
 * The mount state is the silent baseline (pre-existing conflicts don't
 * toast); only *changes* notify. Preferences never toast.
 */
export function ConflictWatcher() {
  const { plan, undo } = usePlan()
  const { notify } = useToast()
  // Null until the first run establishes the silent baseline.
  const seenRef = useRef<Map<string, ConstraintRef> | null>(null)

  const report = useMemo(() => conflicts(plan), [plan])

  useEffect(() => {
    const current = new Map<string, ConstraintRef>()
    for (const ref of [...report.mandatoryUnsatisfied, ...report.separationViolations]) {
      current.set(violationKey(ref), ref)
    }
    if (seenRef.current === null) {
      seenRef.current = current
      return
    }
    const prev = seenRef.current
    seenRef.current = current

    const fresh = [...current.values()].filter((ref) => !prev.has(violationKey(ref)))
    const resolved = [...prev.values()].filter((ref) => !current.has(violationKey(ref)))

    if (fresh.length === 1) {
      notify({
        kind: 'warning',
        message: violationMessage(fresh[0], plan),
        actions: [
          { label: 'Annuler', onAction: undo },
          { label: 'Garder' },
        ],
      })
    } else if (fresh.length > 1) {
      notify({
        kind: 'warning',
        message: `Conflits : ${fresh.length} nouvelles relations à revoir.`,
        actions: [
          { label: 'Annuler', onAction: undo },
          { label: 'Garder' },
        ],
      })
    } else if (resolved.length === 1) {
      notify({ kind: 'success', message: resolutionMessage(resolved[0], plan) })
    } else if (resolved.length > 1) {
      notify({ kind: 'success', message: `${resolved.length} conflits résolus.` })
    }
  }, [report, plan, notify, undo])

  return null
}

'use client'

import { useMemo } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { removeConstraint } from '@/lib/plan/actions'
import { conflicts, constraintsForGuest, guestById } from '@/lib/plan/selectors'
import { ConstraintRow } from './ConstraintRow'
import { AddConstraintMenu } from './AddConstraintMenu'
import { useMessages, format } from '@/lib/i18n'

interface ConstraintsPanelProps {
  /** Selected guest, or null to show every constraint. */
  guestId: string | null
}

/**
 * Constraint list for the selected guest — or all constraints when nothing
 * is selected (docs/07-components.md § 9, docs/11-roadmap.md step 11).
 * Mandatory violations highlight their row (docs/10-interactions.md § 14);
 * removal dispatches directly (Undo covers it, § 12).
 */
export function ConstraintsPanel({ guestId }: ConstraintsPanelProps) {
  const { plan, dispatch } = usePlan()
  const t = useMessages()

  const report = useMemo(() => conflicts(plan), [plan])
  const violatedIds = useMemo(
    () =>
      new Set([
        ...report.mandatoryUnsatisfied.map((ref) => ref.constraintId),
        ...report.separationViolations.map((ref) => ref.constraintId),
      ]),
    [report],
  )
  const softIds = useMemo(
    () => new Set(report.preferenceUnsatisfied.map((ref) => ref.constraintId)),
    [report],
  )

  const guestName = guestId ? (guestById(plan, guestId)?.name ?? null) : null
  const list = guestId ? constraintsForGuest(plan, guestId) : plan.constraints

  return (
    <section aria-label={t.constraints.sectionLabel} className="flex min-h-0 flex-col gap-3">
      <h2 className="font-display text-base font-semibold text-text">
        {guestName ? format(t.constraints.titleForGuest, { name: guestName }) : t.constraints.title}{' '}
        <span data-testid="constraint-count" className="text-sm font-normal text-text-muted">
          ({list.length})
        </span>
      </h2>

      {list.length === 0 ? (
        <p className="text-sm text-text-muted">
          {guestName ? format(t.constraints.emptyForGuest, { name: guestName }) : t.constraints.empty}
        </p>
      ) : (
        <ul className="space-y-1">
          {list.map((constraint) => (
            <ConstraintRow
              key={constraint.id}
              constraint={constraint}
              nameA={guestById(plan, constraint.a)?.name ?? '?'}
              nameB={guestById(plan, constraint.b)?.name ?? '?'}
              violated={violatedIds.has(constraint.id)}
              softViolated={softIds.has(constraint.id)}
              onRemove={(id) => dispatch(removeConstraint(id))}
            />
          ))}
        </ul>
      )}

      <AddConstraintMenu sourceGuestId={guestName ? guestId : null} />
    </section>
  )
}

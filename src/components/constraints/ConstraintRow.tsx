'use client'

import type { Constraint } from '@/types/plan'
import { CONSTRAINT_KIND_LABELS } from './constraints'

interface ConstraintRowProps {
  constraint: Constraint
  nameA: string
  nameB: string
  /** Mandatory violation (unsatisfied must_together or separation). */
  violated: boolean
  /** Unsatisfied soft preference. */
  softViolated: boolean
  onRemove: (constraintId: string) => void
}

const KIND_TONE: Record<Constraint['kind'], string> = {
  must_together: 'bg-success/10 text-success',
  prefer_together: 'bg-info/10 text-info',
  must_not_together: 'bg-danger/10 text-danger',
}

/**
 * One constraint row (docs/07-components.md § 9): kind badge + the two guest
 * names + remove. Mandatory violations render danger-highlighted with a
 * "Non respectée" badge (docs/10-interactions.md § 14); unmet soft
 * preferences get a muted badge.
 */
export function ConstraintRow({ constraint, nameA, nameB, violated, softViolated, onRemove }: ConstraintRowProps) {
  return (
    <li
      className={`flex items-center gap-2 rounded px-3 py-2 ${
        violated ? 'border border-danger/40 bg-danger/10' : 'hover:bg-surface'
      }`}
    >
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${KIND_TONE[constraint.kind]}`}>
        {CONSTRAINT_KIND_LABELS[constraint.kind]}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {nameA} et {nameB}
      </span>
      {violated && (
        <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
          Non respectée
        </span>
      )}
      {!violated && softViolated && (
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
          Souhait non tenu
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(constraint.id)}
        aria-label={`Supprimer la contrainte entre ${nameA} et ${nameB}`}
        title={`Supprimer la contrainte entre ${nameA} et ${nameB}`}
        className="shrink-0 px-1 text-base leading-none text-text-muted transition-colors hover:text-danger"
      >
        ×
      </button>
    </li>
  )
}

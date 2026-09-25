'use client'

import type { Constraint } from '@/types/plan'
import { CONSTRAINT_KIND_LABELS } from './constraints'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { useMessages, format } from '@/lib/i18n'
import { X } from 'lucide-react'

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

const KIND_BADGE_TONE: Record<Constraint['kind'], BadgeTone> = {
  must_together: 'success',
  prefer_together: 'info',
  must_not_together: 'danger',
}

/**
 * One constraint row (docs/07-components.md § 9): kind badge + the two guest
 * names + remove. Mandatory violations render danger-highlighted with a
 * "Non respectée" badge (docs/10-interactions.md § 14); unmet soft
 * preferences get a muted badge.
 */
export function ConstraintRow({ constraint, nameA, nameB, violated, softViolated, onRemove }: ConstraintRowProps) {
  const t = useMessages()
  return (
    <li
      className={`group flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 transition-colors ${
        violated ? 'border-danger/30 bg-danger/10' : 'hover:bg-surface-muted hover:border-border'
      }`}
    >
      <Badge tone={KIND_BADGE_TONE[constraint.kind]}>{CONSTRAINT_KIND_LABELS[constraint.kind]}</Badge>
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        {format(t.constraints.pairLabel, { a: nameA, b: nameB })}
      </span>
      {violated && <Badge tone="danger-solid">{t.constraints.violatedBadge}</Badge>}
      {!violated && softViolated && <Badge tone="neutral">{t.constraints.softViolatedBadge}</Badge>}
      <IconButton
        type="button"
        onClick={() => onRemove(constraint.id)}
        label={format(t.constraints.removeAriaLabel, { a: nameA, b: nameB })}
        title={format(t.constraints.removeAriaLabel, { a: nameA, b: nameB })}
        icon={<X className="h-5 w-5" />}
        className="opacity-100 transition-opacity group-hover:opacity-100 sm:opacity-0"
      />
    </li>
  )
}

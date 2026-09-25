import type { ConstraintRef } from '@/lib/engine'
import { guestById } from '@/lib/plan/selectors'
import { fr, format } from '@/lib/i18n'
import type { ConstraintKind, Plan } from '@/types/plan'

export const CONSTRAINT_KIND_LABELS: Record<ConstraintKind, string> = {
  must_together: fr.constraints.kindMust,
  prefer_together: fr.constraints.kindPrefer,
  must_not_together: fr.constraints.kindNot,
}

function samePair(a1: string, b1: string, a2: string, b2: string): boolean {
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2)
}

/**
 * UI-side validation for a new constraint (docs/07-components.md § 9).
 * Returns the French error message, or null when the input is acceptable.
 * The reducer independently guards self-relations and (kind, pair)
 * duplicates (canonicalizing the pair), so this is a friendly pre-check.
 */
export function validateConstraintInput(
  plan: Plan,
  kind: ConstraintKind,
  a: string,
  b: string,
): string | null {
  if (!guestById(plan, a) || !guestById(plan, b)) return fr.constraints.unknownGuests
  if (a === b) return fr.constraints.selfConstraint
  const pairTaken = (other: ConstraintKind): boolean =>
    plan.constraints.some((c) => c.kind === other && samePair(c.a, c.b, a, b))
  if (pairTaken(kind)) return fr.constraints.duplicate
  const opposite =
    kind === 'must_together' ? 'must_not_together' : kind === 'must_not_together' ? 'must_together' : null
  if (opposite && pairTaken(opposite)) {
    return fr.constraints.incompatible
  }
  return null
}

/** Stable identity of a violation across dispatches (the constraint persists). */
export function violationKey(ref: ConstraintRef): string {
  return ref.constraintId
}

/**
 * Toast copy for a fresh mandatory violation (docs/10-interactions.md § 14).
 * Falls back to the must_together wording when the constraint vanished.
 */
export function violationMessage(ref: ConstraintRef, plan: Plan): string {
  const nameA = guestById(plan, ref.a)?.name ?? '?'
  const nameB = guestById(plan, ref.b)?.name ?? '?'
  const kind = plan.constraints.find((c) => c.id === ref.constraintId)?.kind
  if (kind === 'must_not_together') {
    return format(fr.constraints.violationMustNot, { a: nameA, b: nameB })
  }
  return format(fr.constraints.violationMust, { a: nameA, b: nameB })
}

/** Toast copy for a resolved mandatory violation. */
export function resolutionMessage(ref: ConstraintRef, plan: Plan): string {
  const nameA = guestById(plan, ref.a)?.name ?? '?'
  const nameB = guestById(plan, ref.b)?.name ?? '?'
  return format(fr.constraints.resolved, { a: nameA, b: nameB })
}

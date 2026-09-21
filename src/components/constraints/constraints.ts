import type { ConstraintRef } from '@/lib/engine'
import { guestById } from '@/lib/plan/selectors'
import type { ConstraintKind, Plan } from '@/types/plan'

export const CONSTRAINT_KIND_LABELS: Record<ConstraintKind, string> = {
  must_together: 'Ensemble (obligatoire)',
  prefer_together: 'Ensemble (souhaité)',
  must_not_together: 'Séparés',
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
  if (!guestById(plan, a) || !guestById(plan, b)) return 'Invités inconnus.'
  if (a === b) return 'Un invité ne peut pas avoir une contrainte avec lui-même.'
  const pairTaken = (other: ConstraintKind): boolean =>
    plan.constraints.some((c) => c.kind === other && samePair(c.a, c.b, a, b))
  if (pairTaken(kind)) return 'Cette contrainte existe déjà.'
  const opposite =
    kind === 'must_together' ? 'must_not_together' : kind === 'must_not_together' ? 'must_together' : null
  if (opposite && pairTaken(opposite)) {
    return '« Ensemble (obligatoire) » et « Séparés » sont incompatibles pour la même paire.'
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
    return `Conflit : ${nameA} ne doit pas être avec ${nameB}, mais ils sont à la même table.`
  }
  return `Conflit : ${nameA} doit être avec ${nameB}, mais ils sont à des tables différentes.`
}

/** Toast copy for a resolved mandatory violation. */
export function resolutionMessage(ref: ConstraintRef, plan: Plan): string {
  const nameA = guestById(plan, ref.a)?.name ?? '?'
  const nameB = guestById(plan, ref.b)?.name ?? '?'
  return `Conflit résolu : ${nameA} et ${nameB}.`
}

import { describe, expect, it } from 'vitest'
import type { ConstraintRef } from '@/lib/engine'
import type { Plan } from '@/types/plan'
import { resolutionMessage, validateConstraintInput, violationKey, violationMessage } from './constraints'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const C = (n: number): string => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function plan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [],
    guests: [
      { id: G(1), name: 'Thomas' },
      { id: G(2), name: 'Marie' },
      { id: G(3), name: 'Luc' },
    ],
    constraints: [{ id: C(1), kind: 'must_together', a: G(1), b: G(2) }],
    assignments: [],
  }
}

describe('validateConstraintInput', () => {
  it('accepts a fresh pair', () => {
    expect(validateConstraintInput(plan(), 'prefer_together', G(1), G(3))).toBeNull()
    expect(validateConstraintInput(plan(), 'must_not_together', G(1), G(3))).toBeNull()
  })

  it('rejects self-relations', () => {
    expect(validateConstraintInput(plan(), 'must_together', G(1), G(1))).toBe(
      'Un invité ne peut pas avoir une contrainte avec lui-même.',
    )
  })

  it('rejects duplicate pairs in either order', () => {
    expect(validateConstraintInput(plan(), 'must_together', G(1), G(2))).toBe(
      'Cette contrainte existe déjà.',
    )
    expect(validateConstraintInput(plan(), 'must_together', G(2), G(1))).toBe(
      'Cette contrainte existe déjà.',
    )
  })

  it('rejects must_together vs must_not_together on the same pair', () => {
    expect(validateConstraintInput(plan(), 'must_not_together', G(1), G(2))).toBe(
      '« Ensemble (obligatoire) » et « Séparés » sont incompatibles pour la même paire.',
    )
    expect(validateConstraintInput(plan(), 'must_not_together', G(2), G(1))).toBe(
      '« Ensemble (obligatoire) » et « Séparés » sont incompatibles pour la même paire.',
    )
  })

  it('allows prefer_together alongside a mandatory constraint', () => {
    expect(validateConstraintInput(plan(), 'prefer_together', G(1), G(2))).toBeNull()
  })

  it('rejects unknown guests', () => {
    expect(validateConstraintInput(plan(), 'must_together', G(1), G(9))).toBe('Invités inconnus.')
  })
})

describe('violation copy', () => {
  it('keys violations by constraint id', () => {
    const ref: ConstraintRef = { constraintId: C(1), a: G(1), b: G(2) }
    expect(violationKey(ref)).toBe(C(1))
  })

  it('describes a must_together violation like the spec example', () => {
    const ref: ConstraintRef = { constraintId: C(1), a: G(1), b: G(2) }
    expect(violationMessage(ref, plan())).toBe(
      'Conflit : Thomas doit être avec Marie, mais ils sont à des tables différentes.',
    )
  })

  it('describes a must_not_together violation', () => {
    const p = plan()
    p.constraints.push({ id: C(2), kind: 'must_not_together', a: G(1), b: G(3) })
    const ref: ConstraintRef = { constraintId: C(2), a: G(1), b: G(3) }
    expect(violationMessage(ref, p)).toBe(
      'Conflit : Thomas ne doit pas être avec Luc, mais ils sont à la même table.',
    )
  })

  it('describes a resolution', () => {
    const ref: ConstraintRef = { constraintId: C(1), a: G(1), b: G(2) }
    expect(resolutionMessage(ref, plan())).toBe('Conflit résolu : Thomas et Marie.')
  })
})

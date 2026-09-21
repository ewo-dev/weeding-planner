import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { GenerationReport } from '@/lib/engine'
import type { Plan } from '@/types/plan'
import { GenerationReportDialog } from './GenerationReportDialog'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

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
    ],
    constraints: [],
    assignments: [],
  }
}

function report(overrides: Partial<GenerationReport> = {}): GenerationReport {
  return {
    mandatorySatisfied: [],
    mandatoryUnsatisfied: [],
    preferenceSatisfied: [],
    preferenceUnsatisfied: [],
    separationViolations: [],
    seatedGuests: 2,
    unseatedGuests: 0,
    overflow: false,
    durationMs: 3,
    ...overrides,
  }
}

function renderDialog(r: GenerationReport) {
  render(
    <GenerationReportDialog
      report={r}
      plan={plan()}
      regenerating={false}
      onApply={vi.fn()}
      onRegenerate={vi.fn()}
      onDiscard={vi.fn()}
    />,
  )
}

describe('GenerationReportDialog', () => {
  it('reports a clean generation per the spec mapping', () => {
    renderDialog(
      report({
        mandatorySatisfied: [{ constraintId: 'c1', a: G(1), b: G(2) }],
        preferenceSatisfied: [
          { constraintId: 'c2', a: G(1), b: G(2) },
          { constraintId: 'c3', a: G(1), b: G(2) },
        ],
      }),
    )

    expect(screen.getByText('Plan généré')).toBeInTheDocument()
    expect(screen.getByText('2 invités placés.')).toBeInTheDocument()
    expect(screen.getByText(/Toutes les relations obligatoires sont respectées/)).toBeInTheDocument()
    expect(screen.getByText(/Aucune contrainte de séparation violée/)).toBeInTheDocument()
    expect(screen.getByText('2 / 2 préférences respectées.')).toBeInTheDocument()
    expect(screen.queryByText('Conflits à revoir')).not.toBeInTheDocument()
  })

  it('reports conflicts with per-pair details', () => {
    renderDialog(
      report({
        mandatorySatisfied: [],
        mandatoryUnsatisfied: [{ constraintId: 'c1', a: G(1), b: G(2) }],
        separationViolations: [{ constraintId: 'c2', a: G(1), b: G(2) }],
        preferenceSatisfied: [{ constraintId: 'c3', a: G(1), b: G(2) }],
        preferenceUnsatisfied: [{ constraintId: 'c4', a: G(1), b: G(2) }],
        seatedGuests: 1,
        unseatedGuests: 1,
        overflow: true,
      }),
    )

    expect(screen.getByText('Plan généré avec des conflits')).toBeInTheDocument()
    expect(screen.getByText(/1 contrainte obligatoire n’a pas pu être respectée/)).toBeInTheDocument()
    expect(screen.getByText(/1 contrainte de séparation violée/)).toBeInTheDocument()
    expect(screen.getByText('1 / 2 préférences respectées.')).toBeInTheDocument()
    expect(screen.getByText(/1 invité n’a pas pu être placé/)).toBeInTheDocument()
    expect(screen.getByText(/Pas assez de places/)).toBeInTheDocument()
    expect(
      screen.getByText('Thomas doit être avec Marie, mais aucune table valide n’était disponible.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Thomas ne doit pas être avec Marie, mais ils sont à la même table.'),
    ).toBeInTheDocument()
  })

  it('wires Apply, Regenerate and Discard', () => {
    const onApply = vi.fn()
    const onRegenerate = vi.fn()
    const onDiscard = vi.fn()
    render(
      <GenerationReportDialog
        report={report()}
        plan={plan()}
        regenerating={false}
        onApply={onApply}
        onRegenerate={onRegenerate}
        onDiscard={onDiscard}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Régénérer' }))
    expect(onRegenerate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('disables actions while regenerating', () => {
    render(
      <GenerationReportDialog
        report={report()}
        plan={plan()}
        regenerating
        onApply={vi.fn()}
        onRegenerate={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Régénération…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Appliquer' })).toBeDisabled()
  })
})

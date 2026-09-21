import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Constraint } from '@/types/plan'
import { ConstraintRow } from './ConstraintRow'

const base: Constraint = { id: 'c1', kind: 'must_together', a: 'g1', b: 'g2' }

function renderRow(overrides: Partial<Constraint> = {}, violated = false, softViolated = false) {
  const onRemove = vi.fn()
  render(
    <ConstraintRow
      constraint={{ ...base, ...overrides }}
      nameA="Thomas"
      nameB="Marie"
      violated={violated}
      softViolated={softViolated}
      onRemove={onRemove}
    />,
  )
  return onRemove
}

describe('ConstraintRow', () => {
  it('renders the kind badge with both names', () => {
    renderRow()

    expect(screen.getByText('Ensemble (obligatoire)')).toBeInTheDocument()
    expect(screen.getByText('Thomas et Marie')).toBeInTheDocument()
    expect(screen.queryByText('Non respectée')).not.toBeInTheDocument()
  })

  it('highlights mandatory violations', () => {
    renderRow({ kind: 'must_not_together' }, true)

    expect(screen.getByText('Séparés')).toBeInTheDocument()
    expect(screen.getByText('Non respectée')).toBeInTheDocument()
  })

  it('marks unmet soft preferences without the danger treatment', () => {
    renderRow({ kind: 'prefer_together' }, false, true)

    expect(screen.getByText('Souhait non tenu')).toBeInTheDocument()
    expect(screen.queryByText('Non respectée')).not.toBeInTheDocument()
  })

  it('removes on × click', () => {
    const onRemove = renderRow()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la contrainte entre Thomas et Marie' }))
    expect(onRemove).toHaveBeenCalledWith('c1')
  })
})

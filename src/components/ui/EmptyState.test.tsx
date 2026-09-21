import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Aucun invité pour l’instant"
        description="Ajoutez votre premier invité ci-dessus."
        action={<button type="button" onClick={onClick}>Ajouter</button>}
      />,
    )

    expect(screen.getByText('Aucun invité pour l’instant')).toBeInTheDocument()
    expect(screen.getByText('Ajoutez votre premier invité ci-dessus.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders title alone', () => {
    render(<EmptyState title="Rien ici" />)

    expect(screen.getByText('Rien ici')).toBeInTheDocument()
  })
})

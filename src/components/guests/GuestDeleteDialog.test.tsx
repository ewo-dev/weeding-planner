import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GuestDeleteDialog } from './GuestDeleteDialog'

describe('GuestDeleteDialog', () => {
  it('confirms deletion', () => {
    const onConfirm = vi.fn()
    render(
      <GuestDeleteDialog guestName="Carol" constraintCount={2} onConfirm={onConfirm} onCancel={vi.fn()} />,
    )

    expect(screen.getByText('Supprimer cet invité ?')).toBeInTheDocument()
    expect(screen.getByText(/2 contraintes liées/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels deletion and singularizes the constraint copy', () => {
    const onCancel = vi.fn()
    render(
      <GuestDeleteDialog guestName="Carol" constraintCount={1} onConfirm={vi.fn()} onCancel={onCancel} />,
    )

    expect(screen.getByText(/1 contrainte liée/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

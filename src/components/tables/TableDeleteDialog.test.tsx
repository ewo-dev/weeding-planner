import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TableDeleteDialog } from './TableDeleteDialog'

// jsdom does not implement the <dialog> imperative API; stub it so
// showModal()/close() behave like in a browser (same as PlanList.test.tsx).
beforeAll(() => {
  if (typeof HTMLDialogElement === 'function') {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
})

describe('TableDeleteDialog', () => {
  it('lists seated guests and confirms deletion', () => {
    const onConfirm = vi.fn()
    render(
      <TableDeleteDialog
        tableName="Table 1"
        guestNames={['Alice', 'Bob']}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Supprimer cette table ?')).toBeInTheDocument()
    expect(screen.getByText(/2 invités retourneront/)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels deletion and singularizes the copy', () => {
    const onCancel = vi.fn()
    render(
      <TableDeleteDialog tableName="Table 1" guestNames={['Alice']} onConfirm={vi.fn()} onCancel={onCancel} />,
    )

    expect(screen.getByText(/1 invité retournera/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function renderModal(onClose: () => void = vi.fn(), open = true) {
  render(
    <Modal open={open} onClose={onClose} title="Supprimer ?">
      <button type="button">Confirmer</button>
      <button type="button">Annuler</button>
    </Modal>,
  )
  return onClose
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Supprimer ?">
        body
      </Modal>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the dialog with title and focuses the panel', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'Supprimer ?' })).toBeInTheDocument()
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')
  })

  it('closes on Escape', () => {
    const onClose = renderModal()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not on panel click', () => {
    const onClose = renderModal()

    fireEvent.mouseDown(screen.getByText('Confirmer'))
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = screen.getByRole('dialog').parentElement
    if (!backdrop) throw new Error('expected the backdrop')
    fireEvent.mouseDown(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderModal()

    // Panel starts focused; Tab moves into the first button, then cycles.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveFocus()
  })

  it('returns focus to the opener on unmount', () => {
    const { rerender } = render(<button type="button">Opener</button>)

    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    rerender(
      <>
        <button type="button">Opener</button>
        <Modal open onClose={vi.fn()} title="Supprimer ?">
          body
        </Modal>
      </>,
    )
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')

    rerender(<button type="button">Opener</button>)
    expect(screen.getByRole('button', { name: 'Opener' })).toHaveFocus()
  })
})

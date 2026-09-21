import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintLayout } from './PrintLayout'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

function renderLayout(unseatedNames: string[] = ['Carol']) {
  render(
    <PrintLayout planName="Mariage Alice & Bob" unseatedNames={unseatedNames} seatedCount={2} totalGuests={3}>
      <section aria-label="Table 1">table one</section>
    </PrintLayout>,
  )
}

beforeEach(() => {
  pushMock.mockClear()
  vi.spyOn(window, 'print').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PrintLayout', () => {
  it('renders the header, tables and the unseated section', () => {
    renderLayout()

    expect(screen.getByRole('heading', { name: 'Mariage Alice & Bob' })).toBeInTheDocument()
    expect(screen.getByText(/2 \/ 3 invités placés/)).toBeInTheDocument()
    expect(screen.getByLabelText('Table 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Non placés')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('omits the unseated section when everyone is seated', () => {
    renderLayout([])

    expect(screen.queryByLabelText('Non placés')).not.toBeInTheDocument()
  })

  it('navigates back to the editor and opens the print dialog', () => {
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Retour à l’éditeur' }))
    expect(pushMock).toHaveBeenCalledWith('/editor')

    fireEvent.click(screen.getByRole('button', { name: 'Imprimer' }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})

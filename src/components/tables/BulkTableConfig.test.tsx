import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BulkTableConfig } from './BulkTableConfig'
import type { BulkTableSummary } from './BulkTableConfig'

function renderBulk(tables: BulkTableSummary[] = []) {
  const onApply = vi.fn()
  const onClose = vi.fn()
  render(
    <BulkTableConfig
      defaultCapacity={8}
      defaultShape="round"
      tables={tables}
      onApply={onApply}
      onClose={onClose}
    />,
  )
  return { onApply, onClose }
}

function submit(): void {
  const form = document.querySelector('form')
  if (!form) throw new Error('expected a form')
  fireEvent.submit(form)
}

describe('BulkTableConfig', () => {
  it('applies directly when no table would lose seats', () => {
    const { onApply } = renderBulk([
      { id: 't1', name: 'Table 1', seated: 2 },
      { id: 't2', name: 'Table 2', seated: 0 },
    ])

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Forme'), { target: { value: 'rectangle' } })
    submit()

    expect(onApply).toHaveBeenCalledWith(10, 'rectangle')
  })

  it('asks for confirmation listing affected tables on shrink', () => {
    const { onApply } = renderBulk([
      { id: 't1', name: 'Table 1', seated: 6 },
      { id: 't2', name: 'Table 2', seated: 1 },
    ])

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '4' } })
    submit()

    expect(screen.getByText('Appliquer quand même ?')).toBeInTheDocument()
    expect(screen.getByText(/Table 1 \(6 placés pour 4 places\)/)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer quand même' }))
    expect(onApply).toHaveBeenCalledWith(4, 'round')
  })

  it('rejects an out-of-range capacity', () => {
    const { onApply } = renderBulk()

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '99' } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('entre 1 et 20')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('cancel closes without applying', () => {
    const { onApply, onClose } = renderBulk()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})

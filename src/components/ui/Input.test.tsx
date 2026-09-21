import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'
import { TextArea } from './TextArea'
import { Select } from './Select'

describe('Input', () => {
  it('links the label and passes input props through', () => {
    const onChange = vi.fn()
    render(<Input label="Nom" placeholder="Marie Dupont" defaultValue="A" onChange={onChange} />)

    const input = screen.getByLabelText('Nom')
    expect(input).toHaveAttribute('placeholder', 'Marie Dupont')
    expect(input).toHaveValue('A')
    fireEvent.change(input, { target: { value: 'B' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('hides the label visually while keeping it accessible', () => {
    render(<Input label="Rechercher un invité" hideLabel />)

    const input = screen.getByLabelText('Rechercher un invité')
    expect(input).toBeInTheDocument()
  })

  it('shows the error with invalid styling and describedby linkage', () => {
    render(<Input label="Nom" error="Le nom est requis." />)

    const input = screen.getByLabelText('Nom')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-error'))
    expect(input).toHaveClass('border-danger')
    expect(screen.getByText('Le nom est requis.')).toBeInTheDocument()
  })

  it('shows the hint when there is no error', () => {
    render(<Input label="Nom" hint="Prénom et nom." />)

    expect(screen.getByText('Prénom et nom.')).toBeInTheDocument()
  })
})

describe('TextArea', () => {
  it('renders rows and label like Input', () => {
    render(<TextArea label="Notes" rows={2} defaultValue="hello" />)

    const area = screen.getByLabelText('Notes')
    expect(area).toHaveAttribute('rows', '2')
    expect(area).toHaveValue('hello')
  })

  it('shows the error state', () => {
    render(<TextArea label="Notes" error="Trop long." />)

    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Trop long.')).toBeInTheDocument()
  })
})

describe('Select', () => {
  const options = [
    { value: '', label: 'Choisir…' },
    { value: 'round', label: 'Ronde' },
    { value: 'rectangle', label: 'Rectangulaire' },
  ]

  it('renders options and reports changes', () => {
    const onChange = vi.fn()
    render(<Select label="Forme" options={options} defaultValue="round" onChange={onChange} />)

    const select = screen.getByLabelText('Forme')
    expect(select).toHaveValue('round')
    fireEvent.change(select, { target: { value: 'rectangle' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

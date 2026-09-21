import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and handles clicks', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Enregistrer</Button>)

    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toHaveClass('bg-brand')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant and size classes', () => {
    render(<Button variant="danger" size="sm">Supprimer</Button>)

    const button = screen.getByRole('button', { name: 'Supprimer' })
    expect(button).toHaveClass('bg-danger', 'h-8')
  })

  it('loading disables the button and shows a spinner', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Générer
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Générer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders an icon alongside the label', () => {
    render(<Button icon={<span aria-hidden="true">+</span>}>Ajouter</Button>)

    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children with the neutral tone by default', () => {
    render(<Badge>3 placés</Badge>)

    const badge = screen.getByText('3 placés')
    expect(badge).toHaveClass('bg-surface-muted')
  })

  it('applies tone classes', () => {
    render(<Badge tone="danger">Non respectée</Badge>)

    expect(screen.getByText('Non respectée')).toHaveClass('text-danger')
  })
})

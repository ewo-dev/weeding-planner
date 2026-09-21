import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'
import { Separator } from './Separator'
import { VisuallyHidden } from './VisuallyHidden'

describe('ui basics', () => {
  it('Spinner renders sizes and hides from assistive tech', () => {
    const { container, rerender } = render(<Spinner />)
    const spinner = container.firstChild as HTMLElement
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
    expect(spinner).toHaveClass('h-5', 'animate-spin')

    rerender(<Spinner size="lg" />)
    expect(container.firstChild).toHaveClass('h-6')
  })

  it('Separator renders a divider', () => {
    const { container } = render(<Separator />)
    expect(container.querySelector('hr')).toBeInTheDocument()
  })

  it('VisuallyHidden keeps content accessible but invisible', () => {
    render(
      <button type="button">
        <VisuallyHidden>Fermer</VisuallyHidden>×
      </button>,
    )

    expect(screen.getByRole('button', { name: 'Fermer×' })).toBeInTheDocument()
  })
})

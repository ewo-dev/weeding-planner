import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('names itself via aria-label with a 44px minimum hit area', () => {
    const onClick = vi.fn()
    render(
      <IconButton label="Supprimer Alice" onClick={onClick} icon={<span aria-hidden="true">×</span>} />,
    )

    const button = screen.getByRole('button', { name: 'Supprimer Alice' })
    expect(button).toHaveClass('h-11', 'w-11')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

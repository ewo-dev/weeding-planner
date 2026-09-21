import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestSearchInput } from './GuestSearchInput'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GuestSearchInput', () => {
  it('debounces keystrokes by 150 ms before calling onSearch', async () => {
    const onSearch = vi.fn()
    render(<GuestSearchInput onSearch={onSearch} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ali' } })
    expect(onSearch).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('ali')
  })

  it('restarts the debounce on each keystroke', async () => {
    const onSearch = vi.fn()
    render(<GuestSearchInput onSearch={onSearch} />)

    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'a' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    fireEvent.change(input, { target: { value: 'al' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(onSearch).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('al')
  })

  it('clear button resets the draft and notifies immediately after debounce', async () => {
    const onSearch = vi.fn()
    render(<GuestSearchInput onSearch={onSearch} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ali' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(onSearch).toHaveBeenCalledWith('ali')

    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(onSearch).toHaveBeenLastCalledWith('')
  })
})

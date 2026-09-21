'use client'

import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string
  hideLabel?: boolean
  error?: string | null
  options: SelectOption[]
}

/** Labeled native select, styled (docs/07-components.md § 4). */
export function Select({ label, hideLabel = false, error, options, id: idProp, ...rest }: SelectProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`

  return (
    <div>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-text-muted'}
      >
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-11 w-full cursor-pointer rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-brand focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-soft appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2377776E%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
        }`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value + option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

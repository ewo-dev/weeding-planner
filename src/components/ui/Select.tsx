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
        className={hideLabel ? 'sr-only' : 'mb-1 block text-xs font-medium text-text-muted'}
      >
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-11 w-full rounded border border-border bg-surface-raised px-3 text-sm text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft ${
          error ? 'border-danger' : ''
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
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

'use client'

import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Always paired with a label (visually hidden when compact). */
  label: string
  hideLabel?: boolean
  error?: string | null
  hint?: string
}

export const inputClassName =
  'h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:border-brand focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-soft'

/**
 * Labeled text input (docs/07-components.md § 4, visual rules § 11).
 * Uncontrolled-friendly: `defaultValue`/`name` pass straight through, so
 * existing FormData forms migrate without logic changes.
 */
export function Input({ label, hideLabel = false, error, hint, id: idProp, className = '', ...rest }: InputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-text-muted'}
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${inputClassName} ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

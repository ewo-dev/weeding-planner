'use client'

import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hideLabel?: boolean
  error?: string | null
  hint?: string
}

/** Labeled multi-line input. Same contract as Input (uncontrolled-friendly). */
export function TextArea({ label, hideLabel = false, error, hint, id: idProp, ...rest }: TextAreaProps) {
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
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full min-h-[5rem] resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-brand focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-soft ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
        }`}
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

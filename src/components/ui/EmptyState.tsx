import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Primary next-step action (usually a Button). */
  action?: ReactNode
}

/**
 * Reusable empty placeholder (docs/07-components.md § 4, visual rules § 13).
 * Guides toward the next useful action with a calm, elegant presentation.
 * Uses the bespoke botanical sprig — not icons — so empty screens keep the
 * stationery feel (docs/09-design-system.md § 12).
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-6 text-center sm:p-8">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent"
        >
          {/* Eucalyptus sprig: central stem + paired leaves. */}
          <path d="M22 40 C 22 30 22 18 22 6" />
          <path d="M22 32 C 16 31 12 27 11 22 C 16 23 20 26 22 32 Z" />
          <path d="M22 32 C 28 31 32 27 33 22 C 28 23 24 26 22 32 Z" />
          <path d="M22 22 C 17 21 14 18 13 14 C 18 15 21 18 22 22 Z" />
          <path d="M22 22 C 27 21 30 18 31 14 C 26 15 23 18 22 22 Z" />
          <path d="M22 12 C 19 11 17 9 16 6 C 19 7 21 9 22 12 Z" />
          <path d="M22 12 C 25 11 27 9 28 6 C 25 7 23 9 22 12 Z" />
        </svg>
      </div>
      <p className="text-2xl font-semibold font-text-display tracking-tight text-text">{title}</p>
      {description && <p className="mt-1 text-sm text-text-muted italic">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

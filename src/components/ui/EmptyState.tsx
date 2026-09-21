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
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center sm:p-8">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2a7 7 0 0 1 7 7c0 4-3 7-7 13-4-6-7-9-7-13a7 7 0 0 1 7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </div>
      <p className="text-lg font-medium font-display text-text">{title}</p>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Primary next-step action (usually a Button). */
  action?: ReactNode
}

/**
 * Reusable empty placeholder (docs/07-components.md § 4, visual rules § 13).
 * Guides toward the next useful action.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
      <p className="text-lg font-semibold text-text">{title}</p>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

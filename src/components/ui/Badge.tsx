import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'info' | 'warning' | 'danger' | 'danger-solid'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const TONES: Record<BadgeTone, string> = {
  // docs/09-design-system.md § 11 chips: 28 px, px-2, rounded-sm, bg-surface base.
  neutral: 'bg-surface text-text-muted',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  'danger-solid': 'bg-danger text-white',
}

/** Status pill. Pure visual — no plan-specific types. */
export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-sm px-2 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

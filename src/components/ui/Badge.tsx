import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'info' | 'warning' | 'danger' | 'danger-solid'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const TONES: Record<BadgeTone, string> = {
  // docs/09-design-system.md § 11 chips: warm, subtle backgrounds with
  // matching soft borders for a refined, accessible look.
  neutral: 'bg-surface-muted text-text-muted border-border',
  brand: 'bg-brand-soft text-brand border-brand/20',
  success: 'bg-success/10 text-success border-success/20',
  info: 'bg-info/10 text-info border-info/20',
  warning: 'bg-accent-soft text-warning border-accent/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  'danger-solid': 'bg-danger text-white border-danger',
}

/** Status pill. Pure visual — no plan-specific types. */
export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-sm border px-2 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

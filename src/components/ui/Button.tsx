import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner, disables the button and marks it busy. */
  loading?: boolean
  icon?: ReactNode
}

const SIZES: Record<ButtonSize, string> = {
  // docs/09-design-system.md § 11 sizes, raised to the § 15 baseline:
  // interactive targets are min 44 px. `sm` stays compact for dense
  // secondary actions (toasts); `md` is the mobile default.
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-text-inverse shadow-sm hover:bg-brand-hover hover:shadow active:bg-brand-hover',
  secondary:
    'border border-border bg-surface text-text shadow-sm hover:bg-surface-muted hover:border-border active:bg-surface-muted',
  ghost:
    'text-text-muted hover:text-text hover:bg-surface-muted active:bg-surface-muted',
  danger:
    'bg-danger text-text-inverse shadow-sm hover:bg-danger/90 hover:shadow active:bg-danger/90',
}

/**
 * Shared button (docs/07-components.md § 4). No plan-specific types;
 * preserves every native button prop. Append `className` for layout only
 * (margins, width) — never for color, which the variant owns.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {icon}
      {children}
    </button>
  )
}

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
  // docs/09-design-system.md § 11: sm 32 px, md 40 px (mobile default), lg 48 px.
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-text-inverse hover:bg-brand-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-raised',
  ghost: 'text-text hover:bg-surface',
  danger: 'bg-danger text-text-inverse hover:bg-danger/90',
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
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {icon}
      {children}
    </button>
  )
}

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconButtonSize = 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  /** Accessible name (aria-label). Icon-only buttons must name themselves. */
  label: string
  size?: IconButtonSize
}

const SIZES: Record<IconButtonSize, string> = {
  // Square hit area, 44x44 minimum (docs/07-components.md § 4, § 15 baseline).
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
}

/**
 * Icon-only button with a guaranteed minimum hit area. Fixed ghost styling;
 * append `className` for layout only.
 */
export function IconButton({ icon, label, size = 'md', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded text-lg leading-none text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${SIZES[size]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}

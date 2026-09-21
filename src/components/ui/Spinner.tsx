export type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const SIZES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

/**
 * Loading spinner (docs/07-components.md § 4). Prefer `size`; `className`
 * is an escape hatch for one-off dimensions (appended last).
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${SIZES[size]} ${className}`}
    />
  )
}

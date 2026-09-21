/** Horizontal divider. Pure visual. */
export function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-border ${className}`} />
}

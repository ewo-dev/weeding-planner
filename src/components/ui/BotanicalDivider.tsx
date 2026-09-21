interface BotanicalDividerProps {
  className?: string
}

/** Subtle botanical line divider for elegant section breaks. */
export function BotanicalDivider({ className = '' }: BotanicalDividerProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      >
        <path d="M12 22c4-4 7-8 7-12a7 7 0 0 0-14 0c0 4 3 8 7 12z" />
        <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      </svg>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

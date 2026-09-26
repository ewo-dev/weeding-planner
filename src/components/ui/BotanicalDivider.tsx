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
        width="40"
        height="16"
        viewBox="0 0 40 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-accent-hover"
      >
        {/* Central laurel sprig: vertical stem, two leaf pairs. */}
        <path d="M20 14 C 20 10 20 7 20 2" />
        <path d="M20 11 C 17 11 15.5 9.5 15 7.5 C 17.5 8 19 9 20 11 Z" />
        <path d="M20 11 C 23 11 24.5 9.5 25 7.5 C 22.5 8 21 9 20 11 Z" />
        <path d="M20 6 C 17.5 6 16 4.5 15.5 2.5 C 18 3 19.5 4 20 6 Z" />
        <path d="M20 6 C 22.5 6 24 4.5 24.5 2.5 C 22 3 20.5 4 20 6 Z" />
      </svg>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

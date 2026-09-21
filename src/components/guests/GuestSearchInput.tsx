'use client'

import { useEffect, useState } from 'react'

/** Debounce before the list filter updates (docs/07-components.md § 7). */
const DEBOUNCE_MS = 150

interface GuestSearchInputProps {
  onSearch: (query: string) => void
}

/**
 * Search input with local draft state; the parent filter updates after a
 * 150 ms debounce. The parent must pass a stable `onSearch` (useCallback) so
 * the timer isn't reset by unrelated re-renders.
 */
export function GuestSearchInput({ onSearch }: GuestSearchInputProps) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onSearch(draft), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, onSearch])

  return (
    <div className="relative">
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Rechercher…"
        aria-label="Rechercher un invité"
        className="w-full rounded border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted"
      />
      {draft !== '' && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Effacer la recherche"
          className="absolute inset-y-0 right-0 px-3 text-base text-text-muted transition-colors hover:text-text"
        >
          ×
        </button>
      )}
    </div>
  )
}

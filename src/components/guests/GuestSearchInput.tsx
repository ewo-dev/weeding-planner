'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Search, X } from 'lucide-react'

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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <Input
        type="search"
        label="Rechercher un invité"
        hideLabel
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Rechercher un invité…"
        className="pl-9 pr-9"
      />
      {draft !== '' && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Effacer la recherche"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-base text-text-muted transition-colors hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

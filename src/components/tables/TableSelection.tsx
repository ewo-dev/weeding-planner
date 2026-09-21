'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface TableSelectionValue {
  selectedTableId: string | null
  selectTable: (tableId: string | null) => void
}

const TableSelectionContext = createContext<TableSelectionValue | null>(null)

/**
 * Shared table selection (docs/10-interactions.md § 8, roadmap steps 15–16).
 * Local UI state — never in the plan. Connects the table list, the canvas,
 * and the detail view: selecting in one place highlights and opens the detail
 * everywhere.
 */
export function TableSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const selectTable = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId)
  }, [])

  const value = useMemo(() => ({ selectedTableId, selectTable }), [selectedTableId, selectTable])

  return <TableSelectionContext.Provider value={value}>{children}</TableSelectionContext.Provider>
}

/** Requires a `<TableSelectionProvider>` ancestor (provided by `EditorLayout`). */
export function useTableSelection(): TableSelectionValue {
  const value = useContext(TableSelectionContext)
  if (!value) throw new Error('useTableSelection must be used inside <TableSelectionProvider>')
  return value
}

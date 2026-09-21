'use client'

import { useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { usePlan } from '@/lib/plan/usePlan'
import { seatedGuestsByTable } from '@/lib/plan/selectors'
import { WORKSPACE_DROP_ID } from './dnd'
import { TableCard } from './TableCard'
import { useTableSelection } from '@/components/tables/TableSelection'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Droppable canvas surface (`workspace`) holding the table cards
 * (docs/07-components.md § 6). Warm, faint grid per docs/09-design-system.md § 12;
 * no heavy shadows on the canvas itself. The content box grows with the
 * tables (640×480 minimum) and scrolls; dnd-kit's built-in auto-scroll
 * handles edge scrolling during drags.
 *
 * Table selection is shared UI state (roadmap step 16): the selected card
 * renders a stronger emphasis ring and opens the detail view; clicking the
 * empty canvas or pressing Escape clears it (docs/10-interactions.md § 8).
 *
 * `contentRef` exposes the positioned content box so SeatingEditor can
 * translate pointer drops to workspace coordinates (docs/10-interactions.md
 * § 7).
 */
export function Workspace({ contentRef }: { contentRef?: (element: HTMLDivElement | null) => void }) {
  const { plan } = usePlan()
  const { selectedTableId, selectTable } = useTableSelection()
  const { setNodeRef, isOver } = useDroppable({
    id: WORKSPACE_DROP_ID,
    data: { kind: 'workspace' },
  })

  // Escape clears the canvas selection (docs/10-interactions.md § 8, § 10).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === 'Escape') selectTable(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectTable])

  function setRefs(element: HTMLDivElement | null): void {
    setNodeRef(element)
    contentRef?.(element)
  }

  const byTable = seatedGuestsByTable(plan)

  const maxRight = plan.tables.reduce((max, t) => Math.max(max, t.position.x), 0)
  const maxBottom = plan.tables.reduce((max, t) => Math.max(max, t.position.y), 0)
  const width = Math.max(640, maxRight + 320)
  const height = Math.max(480, maxBottom + 280)

  return (
    <div
      data-testid="workspace-scroll"
      className="min-h-0 flex-1 overflow-auto bg-bg bg-[radial-gradient(circle,rgb(229_225_216/0.85)_1px,transparent_1px)] bg-[size:24px_24px]"
    >
      <div
        ref={setRefs}
        data-testid="workspace"
        role="group"
        aria-label="Plan des tables"
        data-over={isOver || undefined}
        onClick={(event) => {
          if (event.target === event.currentTarget) selectTable(null)
        }}
        className="relative"
        style={{ width, height }}
      >
        {plan.tables.length === 0 ? (
          <div className="absolute left-1/2 top-1/3 w-full max-w-sm -translate-x-1/2 px-4">
            <EmptyState
              title="Aucune table pour l’instant"
              description="Ajoutez vos tables depuis l’onglet Tables, puis glissez-déposez vos invités."
            />
          </div>
        ) : (
          plan.tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              guests={byTable.get(table.id) ?? []}
              selected={table.id === selectedTableId}
              onSelect={(tableId) => selectTable(tableId)}
            />
          ))
        )}
      </div>
    </div>
  )
}

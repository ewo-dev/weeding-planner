'use client'

import { useDroppable } from '@dnd-kit/core'
import { usePlan } from '@/lib/plan/usePlan'
import { seatedGuestsByTable } from '@/lib/plan/selectors'
import { WORKSPACE_DROP_ID } from './dnd'
import { TableCard } from './TableCard'

/**
 * Droppable canvas surface (`workspace`) holding the table cards
 * (docs/07-components.md § 6). Dotted grid per docs/09-design-system.md § 12;
 * no shadows on tables, no pan/zoom in MVP. The content box grows with the
 * tables (640×480 minimum) and scrolls; dnd-kit's built-in auto-scroll
 * handles edge scrolling during drags.
 *
 * `contentRef` exposes the positioned content box so SeatingEditor can
 * translate pointer drops to workspace coordinates (docs/10-interactions.md
 * § 7).
 */
export function Workspace({ contentRef }: { contentRef?: (element: HTMLDivElement | null) => void }) {
  const { plan } = usePlan()
  const { setNodeRef, isOver } = useDroppable({
    id: WORKSPACE_DROP_ID,
    data: { kind: 'workspace' },
  })

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
      className="min-h-0 flex-1 overflow-auto bg-bg bg-[radial-gradient(circle,rgb(148_163_184/0.35)_1px,transparent_1px)] bg-[size:22px_22px]"
    >
      <div
        ref={setRefs}
        data-testid="workspace"
        data-over={isOver || undefined}
        className="relative"
        style={{ width, height }}
      >
        {plan.tables.length === 0 ? (
          <p className="absolute left-1/2 top-1/3 w-full max-w-sm -translate-x-1/2 rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
            Aucune table pour l’instant — ajoutez vos tables depuis l’onglet Tables.
          </p>
        ) : (
          plan.tables.map((table) => (
            <TableCard key={table.id} table={table} guests={byTable.get(table.id) ?? []} />
          ))
        )}
      </div>
    </div>
  )
}

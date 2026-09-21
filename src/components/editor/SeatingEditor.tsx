'use client'

import { useRef, useState } from 'react'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { usePlan } from '@/lib/plan/usePlan'
import { guestById, tableById } from '@/lib/plan/selectors'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { useToast } from '@/components/ui/ToastProvider'
import { arrowKeyboardCoordinates, parseDndId, type ActiveDrag, type DragKind } from './dnd'
import { isFullTableDrop, resolveGuestDrop, resolveTableDrop } from './dropLogic'
import { DragGhost } from './DragGhost'
import { ConflictWatcher } from '@/components/constraints/ConflictWatcher'
import { Workspace } from './Workspace'

interface ActivatorWithCoords {
  clientX?: unknown
  clientY?: unknown
}

/** Reads the drag source from the event (data first, stable id as fallback). */
function readDrag(event: DragStartEvent | DragEndEvent): ActiveDrag | null {
  const data = event.active.data.current as
    | { kind?: DragKind; guestId?: string; tableId?: string }
    | undefined
  const kind: DragKind | undefined = data?.kind ?? parseKind(String(event.active.id))
  if (kind === 'guest') {
    const guestId = data?.guestId ?? parseGuest(String(event.active.id))
    return guestId ? { kind, guestId, tableId: null } : null
  }
  if (kind === 'table') {
    const tableId = data?.tableId ?? parseTable(String(event.active.id))
    return tableId ? { kind, guestId: null, tableId } : null
  }
  return null
}

function parseKind(id: string): DragKind | undefined {
  const parsed = parseDndId(id)
  if (parsed.kind === 'guest') return 'guest'
  if (parsed.kind === 'table') return 'table'
  return undefined
}

function parseGuest(id: string): string | null {
  const parsed = parseDndId(id)
  return parsed.kind === 'guest' ? parsed.guestId : null
}

function parseTable(id: string): string | null {
  const parsed = parseDndId(id)
  return parsed.kind === 'table' ? parsed.tableId : null
}

/**
 * Seating editor canvas (docs/07-components.md § 6, docs/10-interactions.md
 * § 3–7). Hosts the single `<DndContext>` covering the side panel and the
 * canvas — see `dnd.ts` for why the two drag kinds share one context.
 * Sensors: `PointerSensor` (6 px activation) + `KeyboardSensor` (arrows move
 * 25 px; Space/Enter drops per dnd-kit defaults; Escape cancels).
 */
export function SeatingEditor() {
  const { plan, dispatch } = usePlan()
  const { notify } = useToast()
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: arrowKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent): void {
    setActiveDrag(readDrag(event))
  }

  function handleDragEnd(event: DragEndEvent): void {
    const drag = readDrag(event)
    setActiveDrag(null)
    if (!drag) return

    if (drag.kind === 'guest' && drag.guestId) {
      const overId = event.over ? String(event.over.id) : null
      const action = resolveGuestDrop(plan, drag.guestId, overId)
      if (action) {
        dispatch(action)
        return
      }
      // Capacity feedback (docs/11-roadmap.md step 19): a snap-back to a
      // seat that belongs to a full table tells the user why the drop
      // failed instead of silently rejecting.
      if (isFullTableDrop(plan, overId)) {
        notify({
          kind: 'warning',
          message: 'Cette table est complète. Retirez un invité ou augmentez la capacité.',
        })
      }
      return
    }

    if (drag.kind === 'table' && drag.tableId) {
      const table = tableById(plan, drag.tableId)
      const node = workspaceRef.current
      if (!table || !node) return
      // Tables only land on the workspace surface (§ 7): a pointer drop
      // outside its bounds snaps back instead of clamping to an edge.
      const activator = event.activatorEvent as ActivatorWithCoords
      let point: { x: number; y: number }
      if (typeof activator.clientX === 'number' && typeof activator.clientY === 'number') {
        const rect = node.getBoundingClientRect()
        const clientX = activator.clientX + event.delta.x
        const clientY = activator.clientY + event.delta.y
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
          return
        }
        point = { x: clientX - rect.left, y: clientY - rect.top }
      } else {
        // Keyboard drags carry no pointer coordinates: move from the current position.
        point = { x: table.position.x + event.delta.x, y: table.position.y + event.delta.y }
      }
      const action = resolveTableDrop(plan, table.id, point, {
        width: node.clientWidth,
        height: node.clientHeight,
      })
      if (action) dispatch(action)
    }
  }

  function handleDragCancel(): void {
    setActiveDrag(null)
  }

  const activeGuest = activeDrag?.kind === 'guest' && activeDrag.guestId ? guestById(plan, activeDrag.guestId) : undefined
  const activeTable = activeDrag?.kind === 'table' && activeDrag.tableId ? tableById(plan, activeDrag.tableId) : undefined
  const activeSeated = activeTable ? plan.assignments.filter((a) => a.tableId === activeTable.id).length : 0

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <EditorLayout>
        <Workspace
          contentRef={(element) => {
            workspaceRef.current = element
          }}
        />
      </EditorLayout>
      {/* Conflict toasts after manual edits (docs/10-interactions.md § 14). */}
      <ConflictWatcher />
      <DragOverlay>
        {activeGuest ? <DragGhost kind="guest" guest={activeGuest} /> : null}
        {activeTable ? <DragGhost kind="table" table={activeTable} seated={activeSeated} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// Drag & drop identifiers and sensor helpers (docs/10-interactions.md § 4–5).
//
// NOTE on contexts (§ 3): the spec sketches two sibling `<DndContext>`s, but
// dnd-kit resolves hooks against the *nearest* context, so two overlapping
// providers cannot share the canvas — anything inside the inner provider
// (seats, seated chips) would detach from the outer one and side-panel →
// canvas guest drags would break. § 3.2 explicitly permits "a parallel sensor
// group in the same context", so SeatingEditor hosts ONE DndContext covering
// the side panel and the canvas, with `data.kind` ('guest' | 'table')
// discriminating the two drag kinds. Guest drags never touch table
// positioning and vice versa.

/** Droppable id for the unseat zone (the guest list container). */
export const UNSEAT_DROP_ID = 'seat:unseat'

/** Droppable id for the table-positioning surface. */
export const WORKSPACE_DROP_ID = 'workspace'

/** Draggable id for a guest chip. */
export function guestDragId(guestId: string): string {
  return `guest:${guestId}`
}

/** Droppable id for a seat slot (seatIndex is 0-based). */
export function seatDropId(tableId: string, seatIndex: number): string {
  return `seat:${tableId}:${seatIndex}`
}

/** Draggable id for a table card (the header is the drag handle). */
export function tableDragId(tableId: string): string {
  return `table:${tableId}`
}

export type ParsedDndId =
  | { kind: 'guest'; guestId: string }
  | { kind: 'table'; tableId: string }
  | { kind: 'seat'; tableId: string; seatIndex: number }
  | { kind: 'unseat' }
  | { kind: 'workspace' }
  | { kind: 'unknown' }

/** Parses a stable DnD id back to its parts (docs/10-interactions.md § 4). */
export function parseDndId(id: string): ParsedDndId {
  if (id === UNSEAT_DROP_ID) return { kind: 'unseat' }
  if (id === WORKSPACE_DROP_ID) return { kind: 'workspace' }
  const parts = id.split(':')
  if (parts[0] === 'guest' && parts.length === 2 && parts[1] !== '') {
    return { kind: 'guest', guestId: parts[1] }
  }
  if (parts[0] === 'table' && parts.length === 2 && parts[1] !== '') {
    return { kind: 'table', tableId: parts[1] }
  }
  if (parts[0] === 'seat' && parts.length === 3 && parts[1] !== '') {
    const seatIndex = Number(parts[2])
    if (Number.isInteger(seatIndex)) return { kind: 'seat', tableId: parts[1], seatIndex }
  }
  return { kind: 'unknown' }
}

export type DragKind = 'guest' | 'table'

export interface ActiveDrag {
  kind: DragKind
  guestId: string | null
  tableId: string | null
}

export function noActiveDrag(): ActiveDrag {
  return { kind: 'guest', guestId: null, tableId: null }
}

/**
 * Keyboard coordinate getter for the KeyboardSensor (docs/10-interactions.md
 * § 5). Moves the dragged item 25 px per arrow key. Kept local instead of
 * `sortableKeyboardCoordinates` so we don't pull in `@dnd-kit/sortable` —
 * nothing here sorts. Structurally compatible with dnd-kit's
 * `KeyboardCoordinateGetter` (extra args are ignored).
 */
export function arrowKeyboardCoordinates(
  event: KeyboardEvent,
  args: { currentCoordinates: { x: number; y: number } },
): { x: number; y: number } | void {
  const { currentCoordinates } = args
  const STEP = 25
  switch (event.code) {
    case 'ArrowRight':
      return { ...currentCoordinates, x: currentCoordinates.x + STEP }
    case 'ArrowLeft':
      return { ...currentCoordinates, x: currentCoordinates.x - STEP }
    case 'ArrowDown':
      return { ...currentCoordinates, y: currentCoordinates.y + STEP }
    case 'ArrowUp':
      return { ...currentCoordinates, y: currentCoordinates.y - STEP }
    default:
      return undefined
  }
}

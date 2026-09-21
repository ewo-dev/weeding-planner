import type { GenerateOptions } from '@/lib/engine'
import { newId } from '@/lib/id'
import type { Assignment, Constraint, ConstraintKind, Guest, Table, TablePosition } from '@/types/plan'

// Every action is a plain object dispatched through the plan reducer. The
// reducer computes the `inverse` action (stored in the HistoryEntry) while
// applying — creators never attach inverses. `RestoreTable`/`RestoreConstraint`/
// `RestoreAssignments` are internal inverse-only variants (docs/08-decisions.md
// D-014); `markSaved` is an internal bookkeeping action dispatched by the
// provider after a successful autosave.

export interface RenamePlan {
  type: 'renamePlan'
  name: string
}

export interface AddGuest {
  type: 'addGuest'
  guest: Guest
}

export interface UpdateGuest {
  type: 'updateGuest'
  guestId: string
  patch: Partial<Omit<Guest, 'id'>>
}

export interface RemoveGuest {
  type: 'removeGuest'
  guestId: string
}

/** Input shape accepted by {@link addTable}: id is generated, position optional. */
export type TableInput = Omit<Table, 'id' | 'position'> & { position?: TablePosition }

export interface AddTable {
  type: 'addTable'
  table: TableInput & { id: string }
}

export interface UpdateTable {
  type: 'updateTable'
  tableId: string
  patch: Partial<Omit<Table, 'id'>>
}

export interface RemoveTable {
  type: 'removeTable'
  tableId: string
}

export interface MoveGuest {
  type: 'moveGuest'
  guestId: string
  toTableId: string
  toSeatIndex: number
}

export interface UnseatGuest {
  type: 'unseatGuest'
  guestId: string
}

export interface AddConstraint {
  type: 'addConstraint'
  id: string
  kind: ConstraintKind
  a: string
  b: string
}

export interface RemoveConstraint {
  type: 'removeConstraint'
  constraintId: string
}

export interface GenerateSeating {
  type: 'generateSeating'
  options?: GenerateOptions
}

export interface Undo {
  type: 'undo'
}

export interface Redo {
  type: 'redo'
}

// Internal inverse-only variants (restored verbatim, never pushed to history).

export interface RestoreTable {
  type: 'restoreTable'
  table: Table
  assignments: Assignment[]
}

export interface RestoreConstraint {
  type: 'restoreConstraint'
  constraint: Constraint
}

export interface RestoreAssignments {
  type: 'restoreAssignments'
  assignments: Assignment[]
}

export interface MarkSaved {
  type: 'markSaved'
  at: string
}

export type PlanAction =
  | RenamePlan
  | AddGuest
  | UpdateGuest
  | RemoveGuest
  | AddTable
  | UpdateTable
  | RemoveTable
  | MoveGuest
  | UnseatGuest
  | AddConstraint
  | RemoveConstraint
  | GenerateSeating
  | Undo
  | Redo
  | RestoreTable
  | RestoreConstraint
  | RestoreAssignments
  | MarkSaved

// ---------- Action creators ----------

export function renamePlan(name: string): RenamePlan {
  return { type: 'renamePlan', name }
}

export function addGuest(input: Omit<Guest, 'id'>): AddGuest {
  return { type: 'addGuest', guest: { ...input, id: newId() } }
}

export function updateGuest(guestId: string, patch: Partial<Omit<Guest, 'id'>>): UpdateGuest {
  return { type: 'updateGuest', guestId, patch }
}

export function removeGuest(guestId: string): RemoveGuest {
  return { type: 'removeGuest', guestId }
}

export function addTable(input: TableInput): AddTable {
  return { type: 'addTable', table: { ...input, id: newId() } }
}

export function updateTable(tableId: string, patch: Partial<Omit<Table, 'id'>>): UpdateTable {
  return { type: 'updateTable', tableId, patch }
}

export function removeTable(tableId: string): RemoveTable {
  return { type: 'removeTable', tableId }
}

export function moveGuest(guestId: string, toTableId: string, toSeatIndex: number): MoveGuest {
  return { type: 'moveGuest', guestId, toTableId, toSeatIndex }
}

export function unseatGuest(guestId: string): UnseatGuest {
  return { type: 'unseatGuest', guestId }
}

export function addConstraint(kind: ConstraintKind, a: string, b: string): AddConstraint {
  return { type: 'addConstraint', id: newId(), kind, a, b }
}

export function removeConstraint(constraintId: string): RemoveConstraint {
  return { type: 'removeConstraint', constraintId }
}

export function generateSeating(options?: GenerateOptions): GenerateSeating {
  return options ? { type: 'generateSeating', options } : { type: 'generateSeating' }
}

export function undo(): Undo {
  return { type: 'undo' }
}

export function redo(): Redo {
  return { type: 'redo' }
}
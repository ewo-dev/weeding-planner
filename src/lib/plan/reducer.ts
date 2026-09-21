import { generateSeating } from '@/lib/engine'
import type { Plan } from '@/types/plan'
import type { PlanAction } from './actions'

/** Maximum size of the undo stack (docs/08-decisions.md D-014, docs/10-interactions.md § 9). */
export const HISTORY_LIMIT = 50

export interface HistoryEntry {
  /** The original action (NOT including its inverse). */
  action: PlanAction
  /** The action that undoes `action`. */
  inverse: PlanAction
  /** Snapshot of the plan BEFORE the action ran (used as the redo baseline). */
  beforePlan: Plan
}

export interface PlanHistoryState {
  plan: Plan
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** ISO timestamp of the last successful autosave; null until the first save. */
  lastSavedAt: string | null
}

interface Applied {
  plan: Plan
  /** Inverse action; `null` for mutations that are not undoable (rename, internal restores). */
  inverse: PlanAction | null
}

function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.length > HISTORY_LIMIT ? entries.slice(entries.length - HISTORY_LIMIT) : entries
}

/**
 * Pure plan reducer (docs/08-decisions.md D-008, D-014). Every mutation is an
 * immutable update; `applyAction` returns the same `plan` reference when an
 * action is rejected or a no-op, in which case the reducer returns `state`
 * unchanged (no history entry, no redo-stack clear).
 */
export function planReducer(state: PlanHistoryState, action: PlanAction): PlanHistoryState {
  switch (action.type) {
    case 'undo': {
      if (state.past.length === 0) return state
      const entry = state.past[state.past.length - 1]
      return {
        ...state,
        plan: applyAction(state.plan, entry.inverse).plan,
        past: state.past.slice(0, -1),
        future: [...state.future, entry],
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const entry = state.future[state.future.length - 1]
      const applied = applyAction(state.plan, entry.action)
      if (applied.plan === state.plan) {
        // The action can no longer be re-applied (e.g. a later action made the
        // move invalid or the constraint a duplicate); drop the stale entry.
        return { ...state, future: state.future.slice(0, -1) }
      }
      return {
        ...state,
        plan: applied.plan,
        past: capHistory([...state.past, entry]),
        future: state.future.slice(0, -1),
      }
    }
    case 'markSaved':
      return { ...state, lastSavedAt: action.at }
    default: {
      const applied = applyAction(state.plan, action)
      if (applied.plan === state.plan) return state // rejected / no-op
      return {
        ...state,
        plan: applied.plan,
        past: applied.inverse
          ? capHistory([...state.past, { action, inverse: applied.inverse, beforePlan: state.plan }])
          : state.past,
        future: [], // any new mutation clears the redo stack (docs/10-interactions.md § 9)
      }
    }
  }
}

/**
 * Applies an action to the plan without touching history. Mutations with a
 * user-visible effect also produce their inverse; `renamePlan` and the
 * internal restore variants return `inverse: null` and are never undoable.
 */
function applyAction(plan: Plan, action: PlanAction): Applied {
  switch (action.type) {
    case 'renamePlan': {
      if (action.name === plan.meta.name) return { plan, inverse: null }
      return { plan: { ...plan, meta: { ...plan.meta, name: action.name } }, inverse: null }
    }

    case 'addGuest':
      return {
        plan: { ...plan, guests: [...plan.guests, action.guest] },
        inverse: { type: 'removeGuest', guestId: action.guest.id },
      }

    case 'updateGuest': {
      const current = plan.guests.find((g) => g.id === action.guestId)
      if (!current) return { plan, inverse: null }
      const prev: Partial<Omit<import('@/types/plan').Guest, 'id'>> = {}
      for (const key of Object.keys(action.patch) as Array<keyof Omit<import('@/types/plan').Guest, 'id'>>) {
        if (action.patch[key] !== current[key]) prev[key] = current[key]
      }
      if (Object.keys(prev).length === 0) return { plan, inverse: null }
      return {
        plan: { ...plan, guests: plan.guests.map((g) => (g.id === action.guestId ? { ...current, ...action.patch } : g)) },
        inverse: { type: 'updateGuest', guestId: action.guestId, patch: prev },
      }
    }

    case 'removeGuest': {
      const guest = plan.guests.find((g) => g.id === action.guestId)
      if (!guest) return { plan, inverse: null }
      return {
        plan: {
          ...plan,
          guests: plan.guests.filter((g) => g.id !== action.guestId),
          assignments: plan.assignments.filter((a) => a.guestId !== action.guestId),
          constraints: plan.constraints.filter((c) => c.a !== action.guestId && c.b !== action.guestId),
        },
        inverse: { type: 'addGuest', guest },
      }
    }

    case 'addTable': {
      // Deterministic default position: new tables stack vertically under the
      // existing ones (the creator leaves position unset).
      const position = action.table.position ?? { x: 0, y: plan.tables.length * 160 }
      const table = { ...action.table, position }
      return {
        plan: { ...plan, tables: [...plan.tables, table] },
        inverse: { type: 'removeTable', tableId: table.id },
      }
    }

    case 'updateTable': {
      const current = plan.tables.find((t) => t.id === action.tableId)
      if (!current) return { plan, inverse: null }
      const prev: Partial<Omit<import('@/types/plan').Table, 'id'>> = {}
      for (const key of Object.keys(action.patch) as Array<keyof Omit<import('@/types/plan').Table, 'id'>>) {
        // Cast needed: TS types union-keyed writes against the intersection of
        // the property types, which collapses to `undefined` for heterogeneous
        // optional fields.
        if (action.patch[key] !== current[key]) (prev as Record<string, unknown>)[key] = current[key]
      }
      if (Object.keys(prev).length === 0) return { plan, inverse: null }
      // Capacity enforcement is the UI's job: shrinking capacity below the
      // seated count keeps the existing assignments (the UI shows a
      // confirmation modal — docs/10-interactions.md § 12).
      return {
        plan: { ...plan, tables: plan.tables.map((t) => (t.id === action.tableId ? { ...current, ...action.patch } : t)) },
        inverse: { type: 'updateTable', tableId: action.tableId, patch: prev },
      }
    }

    case 'removeTable': {
      const table = plan.tables.find((t) => t.id === action.tableId)
      if (!table) return { plan, inverse: null }
      const removedAssignments = plan.assignments.filter((a) => a.tableId === action.tableId)
      return {
        plan: {
          ...plan,
          tables: plan.tables.filter((t) => t.id !== action.tableId),
          assignments: plan.assignments.filter((a) => a.tableId !== action.tableId),
        },
        inverse: { type: 'restoreTable', table, assignments: removedAssignments },
      }
    }

    case 'moveGuest': {
      const guest = plan.guests.find((g) => g.id === action.guestId)
      const table = plan.tables.find((t) => t.id === action.toTableId)
      if (!guest || !table) return { plan, inverse: null }
      if (action.toSeatIndex < 0 || action.toSeatIndex >= table.capacity) return { plan, inverse: null }
      const current = plan.assignments.find((a) => a.guestId === action.guestId)
      if (current?.tableId === action.toTableId && current.seatIndex === action.toSeatIndex) {
        return { plan, inverse: null } // already at the target seat
      }
      const withoutGuest = plan.assignments.filter((a) => a.guestId !== action.guestId)
      if (withoutGuest.some((a) => a.tableId === action.toTableId && a.seatIndex === action.toSeatIndex)) {
        return { plan, inverse: null } // target slot occupied by another guest
      }
      return {
        plan: { ...plan, assignments: [...withoutGuest, { guestId: action.guestId, tableId: action.toTableId, seatIndex: action.toSeatIndex }] },
        inverse: current
          ? { type: 'moveGuest', guestId: action.guestId, toTableId: current.tableId, toSeatIndex: current.seatIndex }
          : { type: 'unseatGuest', guestId: action.guestId },
      }
    }

    case 'unseatGuest': {
      const current = plan.assignments.find((a) => a.guestId === action.guestId)
      if (!current) return { plan, inverse: null }
      return {
        plan: { ...plan, assignments: plan.assignments.filter((a) => a.guestId !== action.guestId) },
        inverse: { type: 'moveGuest', guestId: action.guestId, toTableId: current.tableId, toSeatIndex: current.seatIndex },
      }
    }

    case 'addConstraint': {
      if (action.a === action.b) return { plan, inverse: null }
      const a = action.a < action.b ? action.a : action.b
      const b = action.a < action.b ? action.b : action.a
      const duplicate = plan.constraints.some(
        (c) => c.kind === action.kind && ((c.a === a && c.b === b) || (c.a === b && c.b === a)),
      )
      if (duplicate) return { plan, inverse: null }
      return {
        plan: { ...plan, constraints: [...plan.constraints, { id: action.id, kind: action.kind, a, b }] },
        inverse: { type: 'removeConstraint', constraintId: action.id },
      }
    }

    case 'removeConstraint': {
      const constraint = plan.constraints.find((c) => c.id === action.constraintId)
      if (!constraint) return { plan, inverse: null }
      return {
        plan: { ...plan, constraints: plan.constraints.filter((c) => c.id !== action.constraintId) },
        inverse: { type: 'restoreConstraint', constraint },
      }
    }

    case 'generateSeating': {
      let assignments: import('@/types/plan').Assignment[]
      try {
        assignments = generateSeating(plan, action.options).assignments
      } catch {
        // Engine rejected the plan (e.g. a temporarily over-capacity state);
        // leave the state untouched.
        return { plan, inverse: null }
      }
      return {
        plan: { ...plan, assignments },
        inverse: { type: 'restoreAssignments', assignments: plan.assignments },
      }
    }

    case 'restoreTable':
      return {
        plan: {
          ...plan,
          tables: [...plan.tables, action.table],
          assignments: [...plan.assignments, ...action.assignments],
        },
        inverse: null,
      }

    case 'restoreConstraint':
      return {
        plan: { ...plan, constraints: [...plan.constraints, action.constraint] },
        inverse: null,
      }

    case 'restoreAssignments':
      return { plan: { ...plan, assignments: action.assignments }, inverse: null }

    default:
      // markSaved is handled by planReducer before applyAction is reached.
      return { plan, inverse: null }
  }
}
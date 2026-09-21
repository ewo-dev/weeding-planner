import type { Guest } from '@/types/plan'

/**
 * Guest list filter + sort (roadmap step 17). Pure helpers so the panel
 * stays small and the logic is unit-testable without rendering.
 */

export type GuestFilter = 'all' | 'unseated' | 'seated' | 'by-table' | 'by-group'
export type GuestSort = 'name' | 'group' | 'table' | 'recent'

export const GUEST_FILTERS: Array<{ value: GuestFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'unseated', label: 'Non placés' },
  { value: 'seated', label: 'Placés' },
  { value: 'by-table', label: 'Par table' },
  { value: 'by-group', label: 'Par groupe' },
]

export const GUEST_SORTS: Array<{ value: GuestSort; label: string }> = [
  { value: 'name', label: 'Nom' },
  { value: 'group', label: 'Groupe' },
  { value: 'table', label: 'Table' },
  { value: 'recent', label: 'Récemment ajouté' },
]

export interface EnrichedGuest {
  guest: Guest
  /** Position in `plan.guests` (insertion order) for the "recent" sort. */
  index: number
  tableId: string | null
  tableName: string | null
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' })

/** Primary sort key; null means "no value" and sorts after named values. */
function primaryKey(entry: EnrichedGuest, sort: GuestSort): string | null {
  switch (sort) {
    case 'group':
      return entry.guest.group ?? null
    case 'table':
      return entry.tableName
    case 'name':
    case 'recent':
      return entry.guest.name
  }
}

export function sortEnriched(entries: EnrichedGuest[], sort: GuestSort): EnrichedGuest[] {
  const copy = [...entries]
  if (sort === 'recent') {
    // `plan.guests` is insertion order — most recent first.
    copy.sort((a, b) => b.index - a.index)
    return copy
  }
  copy.sort((a, b) => {
    const primaryA = primaryKey(a, sort)
    const primaryB = primaryKey(b, sort)
    if (primaryA === null && primaryB === null) return collator.compare(a.guest.name, b.guest.name)
    if (primaryA === null) return 1
    if (primaryB === null) return -1
    const primary = collator.compare(primaryA, primaryB)
    return primary !== 0 ? primary : collator.compare(a.guest.name, b.guest.name)
  })
  return copy
}

export interface TableGroup {
  tableId: string
  tableName: string
  guests: EnrichedGuest[]
}

export interface GroupGroup {
  groupName: string
  guests: EnrichedGuest[]
}

/**
 * Group seated guests by table, ordered by table name. `tableOrder` maps a
 * table id to its position in `plan.tables` as a stable tiebreak for
 * tables sharing a name.
 */
export function groupByTable(seated: EnrichedGuest[], tableOrder: Map<string, number>): TableGroup[] {
  const map = new Map<string, TableGroup>()
  for (const entry of seated) {
    const key = entry.tableId ?? 'unknown'
    const existing = map.get(key)
    if (existing) existing.guests.push(entry)
    else map.set(key, { tableId: key, tableName: entry.tableName ?? 'Sans table', guests: [entry] })
  }
  return [...map.values()].sort((a, b) => {
    const byName = collator.compare(a.tableName, b.tableName)
    if (byName !== 0) return byName
    return (tableOrder.get(a.tableId) ?? 0) - (tableOrder.get(b.tableId) ?? 0)
  })
}

/** Group guests by `guest.group`, alphabetical with "Sans groupe" last. */
export function groupByGroup(entries: EnrichedGuest[]): GroupGroup[] {
  const map = new Map<string, GroupGroup>()
  for (const entry of entries) {
    const key = entry.guest.group ?? ''
    const existing = map.get(key)
    if (existing) existing.guests.push(entry)
    else map.set(key, { groupName: key === '' ? 'Sans groupe' : key, guests: [entry] })
  }
  return [...map.values()].sort((a, b) => {
    if (a.groupName === 'Sans groupe') return 1
    if (b.groupName === 'Sans groupe') return -1
    return collator.compare(a.groupName, b.groupName)
  })
}

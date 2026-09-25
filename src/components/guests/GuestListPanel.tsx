'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { usePlan } from '@/lib/plan/usePlan'
import { removeGuest } from '@/lib/plan/actions'
import { conflicts, constraintsForGuest, guestById, seatedCount, tableById } from '@/lib/plan/selectors'
import type { Guest } from '@/types/plan'
import { ConstraintsPanel } from '@/components/constraints/ConstraintsPanel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { GuestSearchInput } from './GuestSearchInput'
import { GuestList } from './GuestList'
import { GuestEditor } from './GuestEditor'
import { GuestDeleteDialog } from './GuestDeleteDialog'
import { MoveGuestSheet } from './MoveGuestSheet'
import { GuestRow } from './GuestRow'
import { useMessages, format } from '@/lib/i18n'
import {
  GUEST_FILTERS,
  GUEST_SORTS,
  groupByGroup,
  groupByTable,
  sortEnriched,
  type EnrichedGuest,
  type GuestFilter,
  type GuestSort,
} from './guestFilters'
import { UserPlus } from 'lucide-react'

type EditorState = { mode: 'create' } | { mode: 'edit'; guestId: string } | null

/**
 * Unseat dropzone wrapper for the grouped views (`Par table` / `Par groupe`).
 * The flat view keeps its own `seat:unseat` dropzone inside `GuestList`, so
 * this wrapper is only mounted in the grouped branches — never nested.
 */
function GroupedDropzone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'seat:unseat',
    data: { kind: 'unseat' },
  })
  return (
    <div
      ref={setNodeRef}
      data-testid="unseat-dropzone"
      className={`space-y-5 rounded-xl transition-colors ${isOver ? 'bg-brand-soft ring-2 ring-brand' : ''}`}
    >
      {children}
    </div>
  )
}

/**
 * Guest management panel (docs/07-components.md § 7): search input, filter
 * chips, sort select, counts, guest sections, create/edit form. Selection is
 * local UI state (not in the plan) per the composition rules; all mutations
 * dispatch through context and are undoable (docs/10-interactions.md § 9).
 */
export function GuestListPanel() {
  const { plan, dispatch } = usePlan()
  const t = useMessages()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<GuestFilter>('all')
  const [sort, setSort] = useState<GuestSort>('name')
  const [editor, setEditor] = useState<EditorState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null)
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null)

  const handleSearch = useCallback((value: string) => setQuery(value), [])

  // Escape clears the selection (docs/10-interactions.md § 10); skipped
  // inside inputs so typing is never interrupted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if (event.key === 'Escape') setEditor(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const enriched = useMemo<EnrichedGuest[]>(() => {
    const assignmentByGuest = new Map(plan.assignments.map((a) => [a.guestId, a] as const))
    return plan.guests.map((guest, index) => {
      const assignment = assignmentByGuest.get(guest.id)
      const table = assignment ? tableById(plan, assignment.tableId) : undefined
      return {
        guest,
        index,
        tableId: assignment?.tableId ?? null,
        tableName: table?.name ?? null,
      }
    })
  }, [plan])

  const normalized = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      enriched.filter(
        ({ guest }) =>
          normalized === '' ||
          guest.name.toLowerCase().includes(normalized) ||
          (guest.group ?? '').toLowerCase().includes(normalized),
      ),
    [enriched, normalized],
  )

  const unseatedSorted = useMemo(
    () => sortEnriched(visible.filter((e) => e.tableId === null), sort),
    [visible, sort],
  )
  const seatedSorted = useMemo(
    () => sortEnriched(visible.filter((e) => e.tableId !== null), sort),
    [visible, sort],
  )

  const tableOrder = useMemo(() => new Map(plan.tables.map((t, i) => [t.id, i] as const)), [plan.tables])
  const byTableGroups = useMemo(() => groupByTable(seatedSorted, tableOrder), [seatedSorted, tableOrder])
  const byGroupGroups = useMemo(() => groupByGroup(sortEnriched(visible, sort)), [visible, sort])

  const total = plan.guests.length
  const seatedTotal = seatedCount(plan)

  // Guests involved in a mandatory placement conflict get an inline warning
  // badge (docs/10-interactions.md § 14). Recomputed on every plan change.
  const conflictGuestIds = useMemo(() => {
    const report = conflicts(plan)
    const ids = new Set<string>()
    for (const ref of [...report.mandatoryUnsatisfied, ...report.separationViolations]) {
      ids.add(ref.a)
      ids.add(ref.b)
    }
    return ids
  }, [plan])

  function closeEditorFor(guestId: string): void {
    setEditor((current) => (current?.mode === 'edit' && current.guestId === guestId ? null : current))
  }

  // Deletion needs a modal only when constraints reference the guest
  // (docs/10-interactions.md § 12); otherwise dispatch directly (Undo covers it).
  function requestDelete(guestId: string): void {
    const guest = guestById(plan, guestId)
    if (!guest) return
    if (constraintsForGuest(plan, guestId).length > 0) {
      setDeleteTarget(guest)
      return
    }
    dispatch(removeGuest(guestId))
    closeEditorFor(guestId)
  }

  function confirmDelete(): void {
    if (!deleteTarget) return
    dispatch(removeGuest(deleteTarget.id))
    closeEditorFor(deleteTarget.id)
    setDeleteTarget(null)
  }

  const editingGuest = editor?.mode === 'edit' ? (guestById(plan, editor.guestId) ?? null) : null
  const showEditor = editor?.mode === 'create' || editingGuest !== null
  const selectedId = editor?.mode === 'edit' ? editor.guestId : null

  function renderRow(entry: EnrichedGuest) {
    return (
      <GuestRow
        key={entry.guest.id}
        guest={entry.guest}
        tableName={entry.tableName}
        selected={entry.guest.id === selectedId}
        hasConflict={conflictGuestIds.has(entry.guest.id)}
        onEdit={(guestId) => setEditor({ mode: 'edit', guestId })}
        onRemove={requestDelete}
        onMove={setMoveTargetId}
      />
    )
  }

  const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-text-muted'

  return (
    <section aria-label={t.guests.sectionLabel} className="flex min-h-0 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-text">{t.guests.sectionLabel}</h2>
        <span data-testid="guest-count" className="text-sm font-medium text-text-muted">
          {format(t.guests.seatedCount, { seated: seatedTotal, total })}
        </span>
      </div>

      <Button type="button" icon={<UserPlus className="h-4 w-4" />} onClick={() => setEditor((current) => (current?.mode === 'create' ? null : { mode: 'create' }))}>
        {t.common.add}
      </Button>

      <GuestSearchInput onSearch={handleSearch} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t.guests.filterLabel} className="flex flex-wrap gap-1.5">
          {GUEST_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`min-h-[44px] rounded-full border px-3 text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'border-brand bg-brand-soft text-text'
                  : 'border-border bg-surface text-text-muted hover:text-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-text-muted">
          {t.guests.sortLabel}
          <select
            aria-label={t.guests.sortAriaLabel}
            value={sort}
            onChange={(event) => setSort(event.target.value as GuestSort)}
            className="min-h-[44px] rounded-md border border-border bg-surface px-2 text-sm text-text"
          >
            {GUEST_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {total === 0 && (
        <EmptyState
          title={t.guests.emptyTitle}
          description={t.guests.emptyDescription}
        />
      )}

      {total > 0 && visible.length === 0 && (
        <EmptyState title={format(t.guests.noResults, { query: query.trim() })} />
      )}

      {filter === 'by-table' ? (
        <GroupedDropzone>
          {unseatedSorted.length > 0 && (
            <section aria-label={t.guests.unseated}>
              <h3 className={sectionTitle}>{t.guests.unseated} ({unseatedSorted.length})</h3>
              <ul className="mt-2 space-y-1">{unseatedSorted.map(renderRow)}</ul>
            </section>
          )}
          {byTableGroups.map((group) => (
            <section key={group.tableId} aria-label={group.tableName}>
              <h3 className={sectionTitle}>
                {group.tableName} ({group.guests.length})
              </h3>
              <ul className="mt-2 space-y-1">{group.guests.map(renderRow)}</ul>
            </section>
          ))}
        </GroupedDropzone>
      ) : filter === 'by-group' ? (
        <GroupedDropzone>
          {byGroupGroups.map((group) => (
            <section key={group.groupName} aria-label={group.groupName}>
              <h3 className={sectionTitle}>
                {group.groupName} ({group.guests.length})
              </h3>
              <ul className="mt-2 space-y-1">{group.guests.map(renderRow)}</ul>
            </section>
          ))}
        </GroupedDropzone>
      ) : (
        /* Always mounted: the list doubles as the `seat:unseat` dropzone. */
        <GuestList
          unseated={filter === 'seated' ? [] : unseatedSorted.map((entry) => entry.guest)}
          seated={
            filter === 'unseated'
              ? []
              : seatedSorted.map((entry) => ({ guest: entry.guest, tableName: entry.tableName }))
          }
          selectedId={selectedId}
          conflictIds={conflictGuestIds}
          onEdit={(guestId) => setEditor({ mode: 'edit', guestId })}
          onRemove={requestDelete}
          onMove={setMoveTargetId}
        />
      )}

      <ConstraintsPanel guestId={editor?.mode === 'edit' ? editor.guestId : null} />

      {showEditor && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <GuestEditor
            key={editor?.mode === 'edit' ? editor.guestId : 'new'}
            guest={editingGuest}
            onClose={() => setEditor(null)}
            onDelete={requestDelete}
          />
        </div>
      )}

      {deleteTarget && (
        <GuestDeleteDialog
          guestName={deleteTarget.name}
          constraintCount={constraintsForGuest(plan, deleteTarget.id).length}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {moveTargetId && <MoveGuestSheet guestId={moveTargetId} onClose={() => setMoveTargetId(null)} />}
    </section>
  )
}

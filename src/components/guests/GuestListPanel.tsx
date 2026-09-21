'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { removeGuest } from '@/lib/plan/actions'
import { constraintsForGuest, guestById, seatedCount, tableById } from '@/lib/plan/selectors'
import type { Guest } from '@/types/plan'
import { GuestSearchInput } from './GuestSearchInput'
import { GuestList } from './GuestList'
import { GuestEditor } from './GuestEditor'
import { GuestDeleteDialog } from './GuestDeleteDialog'

type EditorState = { mode: 'create' } | { mode: 'edit'; guestId: string } | null

/**
 * Guest management panel (docs/07-components.md § 7): search input, counts,
 * Unseated/Seated list, create/edit form. Selection is local UI state (not in
 * the plan) per the composition rules; all mutations dispatch through
 * context and are undoable (docs/10-interactions.md § 9).
 */
export function GuestListPanel() {
  const { plan, dispatch } = usePlan()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<EditorState>(null)
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null)

  const handleSearch = useCallback((value: string) => setQuery(value), [])

  // Escape clears the selection (docs/10-interactions.md § 10); skipped
  // inside inputs so typing is never interrupted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === 'Escape') setEditor(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const tableByGuest = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const assignment of plan.assignments) {
      map.set(assignment.guestId, tableById(plan, assignment.tableId)?.name ?? null)
    }
    return map
  }, [plan])

  const seatedIds = useMemo(() => new Set(plan.assignments.map((a) => a.guestId)), [plan.assignments])

  const normalized = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      plan.guests.filter(
        (guest) =>
          normalized === '' ||
          guest.name.toLowerCase().includes(normalized) ||
          (guest.group ?? '').toLowerCase().includes(normalized),
      ),
    [plan.guests, normalized],
  )

  const unseated = visible.filter((guest) => !seatedIds.has(guest.id))
  const seated = visible
    .filter((guest) => seatedIds.has(guest.id))
    .map((guest) => ({ guest, tableName: tableByGuest.get(guest.id) ?? null }))

  const total = plan.guests.length
  const seatedTotal = seatedCount(plan)

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

  return (
    <section aria-label="Invités" className="flex min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Invités</h2>
        <span data-testid="guest-count" className="text-sm text-text-muted">
          {seatedTotal} / {total} placés
        </span>
      </div>

      <button
        type="button"
        onClick={() => setEditor((current) => (current?.mode === 'create' ? null : { mode: 'create' }))}
        className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
      >
        + Ajouter
      </button>

      <GuestSearchInput onSearch={handleSearch} />

      {total === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium text-text">Aucun invité pour l’instant</p>
          <p className="mt-1 text-sm text-text-muted">Ajoutez votre premier invité ci-dessus.</p>
        </div>
      )}

      {total > 0 && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
          Aucun résultat pour « {query.trim()} ».
        </p>
      )}

      {/* Always mounted: the list doubles as the `seat:unseat` dropzone. */}
      <GuestList
        unseated={unseated}
        seated={seated}
        selectedId={editor?.mode === 'edit' ? editor.guestId : null}
        onEdit={(guestId) => setEditor({ mode: 'edit', guestId })}
        onRemove={requestDelete}
      />

      {showEditor && (
        <div className="rounded-lg border border-border bg-surface p-4">
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
    </section>
  )
}

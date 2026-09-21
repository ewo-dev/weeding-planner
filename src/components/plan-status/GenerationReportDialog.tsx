'use client'

import { useEffect, useRef } from 'react'
import type { ConstraintRef, GenerationReport } from '@/lib/engine'
import { guestById } from '@/lib/plan/selectors'
import type { Plan } from '@/types/plan'

interface GenerationReportDialogProps {
  report: GenerationReport
  /** For guest-name lookup in the conflict details. */
  plan: Plan
  regenerating: boolean
  onApply: () => void
  onRegenerate: () => void
  onDiscard: () => void
}

function names(ref: ConstraintRef, plan: Plan): [string, string] {
  return [guestById(plan, ref.a)?.name ?? '?', guestById(plan, ref.b)?.name ?? '?']
}

/**
 * Post-generation report (docs/07-components.md § 10). Maps the
 * `GenerationReport` to copy per docs/04-seating-engine.md § 6 and
 * docs/01-product.md § 10 — in French (D-011). Mandatory problems render
 * prominently with per-pair details; nothing mandatory is silently
 * swallowed. Actions: Apply, Regenerate, Discard.
 * TODO step 4: replace with the shared <Modal> primitive (components/ui/Modal).
 */
export function GenerationReportDialog({
  report,
  plan,
  regenerating,
  onApply,
  onRegenerate,
  onDiscard,
}: GenerationReportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  const mandatoryTotal = report.mandatorySatisfied.length + report.mandatoryUnsatisfied.length
  const preferenceTotal = report.preferenceSatisfied.length + report.preferenceUnsatisfied.length
  const hasMandatoryProblems =
    report.mandatoryUnsatisfied.length > 0 || report.separationViolations.length > 0

  const successLine = 'flex items-start gap-2 text-sm text-success'
  const dangerLine = 'flex items-start gap-2 text-sm font-medium text-danger'
  const mutedLine = 'flex items-start gap-2 text-sm text-text-muted'

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="generation-report-title"
      onCancel={onDiscard}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface-raised p-5 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="generation-report-title" className="font-display text-lg font-semibold text-text">
        {hasMandatoryProblems ? 'Plan généré avec des conflits' : 'Plan généré'}
      </h2>

      {/* Generation reports are assertive live regions (design § 15). */}
      <div role="alert" className="mt-3 space-y-1.5">
        <p className="text-sm text-text">
          {report.seatedGuests === 1 ? '1 invité placé.' : `${report.seatedGuests} invités placés.`}
        </p>

        {mandatoryTotal === 0 ? (
          <p className={mutedLine}>Aucune contrainte obligatoire définie.</p>
        ) : report.mandatoryUnsatisfied.length === 0 ? (
          <p className={successLine}>
            <span aria-hidden="true">✓</span> Toutes les relations obligatoires sont respectées.
          </p>
        ) : (
          <p className={dangerLine}>
            {report.mandatoryUnsatisfied.length === 1
              ? '1 contrainte obligatoire n’a pas pu être respectée.'
              : `${report.mandatoryUnsatisfied.length} contraintes obligatoires n’ont pas pu être respectées.`}
          </p>
        )}

        {report.separationViolations.length === 0 ? (
          <p className={successLine}>
            <span aria-hidden="true">✓</span> Aucune contrainte de séparation violée.
          </p>
        ) : (
          <p className={dangerLine}>
            {report.separationViolations.length === 1
              ? '1 contrainte de séparation violée.'
              : `${report.separationViolations.length} contraintes de séparation violées.`}
          </p>
        )}

        {preferenceTotal === 0 ? (
          <p className={mutedLine}>Aucune préférence définie.</p>
        ) : (
          <p className={report.preferenceUnsatisfied.length === 0 ? successLine : mutedLine}>
            {report.preferenceSatisfied.length} / {preferenceTotal} préférences respectées.
          </p>
        )}

        {report.unseatedGuests > 0 && (
          <p className={dangerLine}>
            {report.unseatedGuests === 1
              ? '1 invité n’a pas pu être placé.'
              : `${report.unseatedGuests} invités n’ont pas pu être placés.`}
          </p>
        )}
        {report.overflow && (
          <p className={dangerLine}>Pas assez de places — ajoutez des tables ou réduisez les invités.</p>
        )}
      </div>

      {hasMandatoryProblems && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3">
          <h3 className="text-sm font-semibold text-danger">Conflits à revoir</h3>
          <ul className="mt-1 space-y-1 text-sm text-text">
            {report.mandatoryUnsatisfied.map((ref) => {
              const [nameA, nameB] = names(ref, plan)
              return (
                <li key={ref.constraintId}>
                  {nameA} doit être avec {nameB}, mais aucune table valide n’était disponible.
                </li>
              )
            })}
            {report.separationViolations.map((ref) => {
              const [nameA, nameB] = names(ref, plan)
              return (
                <li key={ref.constraintId}>
                  {nameA} ne doit pas être avec {nameB}, mais ils sont à la même table.
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="rounded px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          Abandonner
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="rounded border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
        >
          {regenerating ? 'Régénération…' : 'Régénérer'}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={regenerating}
          className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          Appliquer
        </button>
      </div>
    </dialog>
  )
}

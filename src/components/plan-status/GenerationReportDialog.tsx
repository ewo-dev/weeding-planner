'use client'

import type { ConstraintRef, GenerationReport } from '@/lib/engine'
import { guestById } from '@/lib/plan/selectors'
import type { Plan } from '@/types/plan'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

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
 * swallowed. Actions: Apply, Regenerate, Discard. Rendered in the shared
 * <Modal>; the parent conditionally mounts it.
 */
export function GenerationReportDialog({
  report,
  plan,
  regenerating,
  onApply,
  onRegenerate,
  onDiscard,
}: GenerationReportDialogProps) {
  const mandatoryTotal = report.mandatorySatisfied.length + report.mandatoryUnsatisfied.length
  const preferenceTotal = report.preferenceSatisfied.length + report.preferenceUnsatisfied.length
  const hasMandatoryProblems =
    report.mandatoryUnsatisfied.length > 0 || report.separationViolations.length > 0

  const successLine = 'flex items-start gap-2 text-sm text-success'
  const dangerLine = 'flex items-start gap-2 text-sm font-medium text-danger'
  const mutedLine = 'flex items-start gap-2 text-sm text-text-muted'

  return (
    <Modal
      open
      onClose={onDiscard}
      size="lg"
      title={hasMandatoryProblems ? 'Plan généré avec des conflits' : 'Plan généré'}
    >
      {/* Generation reports are assertive live regions (design § 15). */}
      <div role="alert" className="space-y-1.5">
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
        <Button variant="ghost" onClick={onDiscard}>
          Abandonner
        </Button>
        <Button variant="secondary" loading={regenerating} onClick={onRegenerate}>
          {regenerating ? 'Régénération…' : 'Régénérer'}
        </Button>
        <Button variant="primary" disabled={regenerating} onClick={onApply}>
          Appliquer
        </Button>
      </div>
    </Modal>
  )
}
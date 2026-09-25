'use client'

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import type { ConstraintRef, GenerationReport } from '@/lib/engine'
import { guestById } from '@/lib/plan/selectors'
import type { Plan } from '@/types/plan'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useMessages, format } from '@/lib/i18n'

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
  const t = useMessages()
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
      title={hasMandatoryProblems ? t.generate.titleConflict : t.generate.titleSuccess}
    >
      {/* Generation reports are assertive live regions (design § 15). */}
      <div role="alert" className="space-y-2">
        <p className="text-sm text-text">
          {report.seatedGuests === 1
            ? t.generate.seatedOne
            : format(t.generate.seatedMany, { n: report.seatedGuests })}
        </p>

        {mandatoryTotal === 0 ? (
          <p className={mutedLine}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.generate.noMandatory}
          </p>
        ) : report.mandatoryUnsatisfied.length === 0 ? (
          <p className={successLine}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.generate.allMandatoryOk}
          </p>
        ) : (
          <p className={dangerLine}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {report.mandatoryUnsatisfied.length === 1
              ? t.generate.mandatoryOne
              : format(t.generate.mandatoryMany, { n: report.mandatoryUnsatisfied.length })}
          </p>
        )}

        {report.separationViolations.length === 0 ? (
          <p className={successLine}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.generate.noSeparation}
          </p>
        ) : (
          <p className={dangerLine}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {report.separationViolations.length === 1
              ? t.generate.separationOne
              : format(t.generate.separationMany, { n: report.separationViolations.length })}
          </p>
        )}

        {preferenceTotal === 0 ? (
          <p className={mutedLine}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.generate.noPreference}
          </p>
        ) : (
          <p className={report.preferenceUnsatisfied.length === 0 ? successLine : mutedLine}>
            {report.preferenceUnsatisfied.length === 0 && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {report.preferenceUnsatisfied.length > 0 && (
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {format(t.generate.preferences, {
              satisfied: report.preferenceSatisfied.length,
              total: preferenceTotal,
            })}
          </p>
        )}

        {report.unseatedGuests > 0 && (
          <p className={dangerLine}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {report.unseatedGuests === 1
              ? t.generate.unseatedOne
              : format(t.generate.unseatedMany, { n: report.unseatedGuests })}
          </p>
        )}
        {report.overflow && (
          <p className={dangerLine}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.generate.overflow}
          </p>
        )}
      </div>

      {hasMandatoryProblems && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
          <h3 className="font-display text-sm font-semibold text-danger">{t.generate.conflictsTitle}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-text">
            {report.mandatoryUnsatisfied.map((ref) => {
              const [nameA, nameB] = names(ref, plan)
              return (
                <li key={ref.constraintId}>
                  {format(t.generate.mustDetail, { a: nameA, b: nameB })}
                </li>
              )
            })}
            {report.separationViolations.map((ref) => {
              const [nameA, nameB] = names(ref, plan)
              return (
                <li key={ref.constraintId}>
                  {format(t.generate.separationDetail, { a: nameA, b: nameB })}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onDiscard}>
          {t.generate.discard}
        </Button>
        <Button variant="secondary" loading={regenerating} onClick={onRegenerate}>
          {regenerating ? t.generate.regenerating : t.generate.regenerate}
        </Button>
        <Button variant="primary" disabled={regenerating} onClick={onApply}>
          {t.common.apply}
        </Button>
      </div>
    </Modal>
  )
}

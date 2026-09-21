import type { Assignment } from '@/types/plan'

/** Options controlling one call to {@link generateSeating}. */
export interface GenerateOptions {
  /** Deterministic PRNG seed for the local-search phase. Defaults to a hash of `plan.meta.updatedAt`. */
  seed?: number
  /** Maximum local-search iterations. Defaults to 200. */
  maxIterations?: number
}

/** A single constraint, referenced from a {@link GenerationReport}. */
export interface ConstraintRef {
  constraintId: string
  a: string
  b: string
}

/** Feedback about how a seating run (or existing assignments) satisfied constraints. */
export interface GenerationReport {
  mandatorySatisfied: ConstraintRef[]
  mandatoryUnsatisfied: ConstraintRef[]
  preferenceSatisfied: ConstraintRef[]
  preferenceUnsatisfied: ConstraintRef[]
  separationViolations: ConstraintRef[]
  seatedGuests: number
  unseatedGuests: number
  overflow: boolean
  durationMs: number
}

/** The result of a seating run: assignments plus the conflict report. */
export interface GenerateOutput {
  assignments: Assignment[]
  report: GenerationReport
}
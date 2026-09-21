/** Deterministic auto-seating: returns assignments plus a conflict report. */
export { generateSeating } from './generate'
/** Pure scoring of a plan + assignment set (see `04-seating-engine.md` § 5). */
export { scorePlan } from './score'
/** Conflict report for existing assignments (used after manual edits). */
export { detectConflicts } from './conflicts'
/** Typed engine error with a discriminated `code`. */
export { EngineError } from './errors'
/** Deterministic mulberry32 PRNG for advanced callers. */
export { createMulberry32 } from './prng'

export type { ConstraintRef, GenerateOptions, GenerateOutput, GenerationReport } from './types'
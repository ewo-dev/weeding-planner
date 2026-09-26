import { z } from 'zod'
import { CURRENT_VERSION, migrate } from '@/lib/schema/migrations'
import { PlanSchema } from '@/lib/schema/plan'
import type { Constraint, Plan } from '@/lib/schema/plan'
import { RepoError } from '@/lib/repo/errors'
import { newId } from '@/lib/id'
import { fr, format, type Messages } from '@/lib/i18n'

/**
 * Versioned JSON project envelope (docs/05-persistence.md § 6,
 * docs/03-data-model.md § 7). The envelope version (`formatVersion`) evolves
 * independently from the plan's `meta.schemaVersion`.
 */
export const PROJECT_FILE_FORMAT = 'plan-de-table-project' as const
export const PROJECT_FILE_VERSION = 1

const ProjectEnvelopeSchema = z.object({
  format: z.string(),
  formatVersion: z.number(),
  exportedAt: z.string(),
  plan: z.unknown(),
})

export type ProjectEnvelope = {
  format: typeof PROJECT_FILE_FORMAT
  formatVersion: number
  exportedAt: string
  plan: Plan
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      out[key] = sortValue(record[key])
    }
    return out
  }
  return value
}

/** Deterministic JSON: sorted object keys, 2-space indent, trailing newline. */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`
}

function canonicalizeConstraintPair(c: Constraint): Constraint {
  return c.a <= c.b ? c : { ...c, a: c.b, b: c.a }
}

/** Sort `(a, b)` lexicographically (D-009, docs/03-data-model.md § 4.4). */
export function canonicalizePlan(plan: Plan): Plan {
  return {
    ...plan,
    constraints: plan.constraints.map(canonicalizeConstraintPair),
  }
}

/**
 * Build the deterministic JSON text for a plan. Validates first so a corrupt
 * in-memory plan can never produce a corrupt file.
 */
export function serializeProjectFile(plan: Plan, exportedAt = new Date().toISOString(), messages: Messages = fr): string {
  const canonical = canonicalizePlan(plan)
  const result = PlanSchema.safeParse({
    ...canonical,
    meta: { ...canonical.meta, schemaVersion: CURRENT_VERSION },
  })
  if (!result.success) {
    throw new RepoError('corrupt', messages.project.invalidPlan, result.error)
  }
  const envelope: ProjectEnvelope = {
    format: PROJECT_FILE_FORMAT,
    formatVersion: PROJECT_FILE_VERSION,
    exportedAt,
    plan: result.data,
  }
  return stableStringify(envelope)
}

/** Parse + validate + migrate raw JSON text. Throws `RepoError('corrupt')`. */
export function parseProjectFileText(text: string, messages: Messages = fr): Plan {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    throw new RepoError('corrupt', messages.project.unreadable, err)
  }
  return parseProjectFileJson(raw, messages)
}

/** Parse + validate + migrate an already-parsed JSON value. */
export function parseProjectFileJson(raw: unknown, messages: Messages = fr): Plan {
  const envelope = ProjectEnvelopeSchema.safeParse(raw)
  if (!envelope.success) {
    throw new RepoError(
      'corrupt',
      messages.project.invalidEnvelope,
      envelope.error,
    )
  }

  if (envelope.data.format !== PROJECT_FILE_FORMAT) {
    throw new RepoError(
      'corrupt',
      format(messages.project.unknownFormat, { format: envelope.data.format }),
    )
  }

  const { formatVersion } = envelope.data
  if (!Number.isInteger(formatVersion) || formatVersion < 1) {
    throw new RepoError('corrupt', messages.project.invalidVersion)
  }
  if (formatVersion > PROJECT_FILE_VERSION) {
    throw new RepoError(
      'corrupt',
      messages.project.newerVersion,
    )
  }
  // Format migrations run sequentially (forward-only). Only v1 exists today,
  // so a v1 file needs no transformation — the loop is the extension point.
  let planRaw: unknown = envelope.data.plan
  for (let v = formatVersion; v < PROJECT_FILE_VERSION; v += 1) {
    planRaw = migrateProjectFormat(planRaw)
  }

  let migrated: unknown
  try {
    migrated = migrate(planRaw)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('future')) {
      throw new RepoError(
        'corrupt',
        messages.project.newerVersion,
        err,
      )
    }
    throw new RepoError('corrupt', messages.project.corruptPlan, err)
  }

  const result = PlanSchema.safeParse(migrated)
  if (!result.success) {
    throw new RepoError('corrupt', messages.project.invalidRules, result.error)
  }
  return canonicalizePlan(result.data)
}

function migrateProjectFormat(planRaw: unknown): unknown {
  // No historical format migrations yet (current version is 1).
  return planRaw
}

/**
 * Clone a validated plan for import: fresh plan id so existing work is never
 * overwritten, timestamps refreshed, schema version pinned to current.
 * Entity ids are preserved (assignments reference them).
 */
export function prepareImportedPlan(plan: Plan, now = new Date().toISOString(), messages: Messages = fr): Plan {
  const imported: Plan = {
    ...canonicalizePlan(plan),
    meta: {
      ...plan.meta,
      id: newId(),
      updatedAt: now,
      schemaVersion: CURRENT_VERSION,
    },
  }
  const result = PlanSchema.safeParse(imported)
  if (!result.success) {
    throw new RepoError('corrupt', messages.project.invalidRules, result.error)
  }
  return result.data
}

/** Safe `.json` filename derived from the plan name (docs/05-persistence.md § 6). */
export function projectFileName(planName: string): string {
  const slug = planName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9À-ÿ_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 60)
  return `${slug || 'plan'}.json`
}

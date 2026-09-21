export const CURRENT_VERSION = 1

export type Migration = (raw: unknown) => unknown

const migrations: Record<number, Migration> = {
  1: (raw) => raw, // identity
}

/**
 * Migrates a stored plan from its persisted `schemaVersion` up to CURRENT_VERSION.
 * Throws a plain Error when the stored version is missing, malformed, or from a
 * future release (the repository wraps it into RepoError('corrupt')).
 */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('migrate: input must be a plan object')
  }

  const record = raw as Record<string, unknown>
  const meta = record.meta as Record<string, unknown> | undefined
  const version = meta?.schemaVersion

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new Error(`migrate: missing or invalid schemaVersion (got ${String(version)})`)
  }

  if (version > CURRENT_VERSION) {
    throw new Error(`migrate: unknown future schemaVersion ${version} (current is ${CURRENT_VERSION})`)
  }

  let data: unknown = raw
  for (let v = version; v < CURRENT_VERSION; v += 1) {
    const migration = migrations[v]
    if (!migration) {
      throw new Error(`migrate: no migration registered for version ${v}`)
    }
    data = migration(data)
  }
  return data
}
export type RepoErrorCode = 'not_found' | 'quota' | 'network' | 'auth' | 'corrupt' | 'unknown'

/**
 * Typed persistence failure. The UI maps `code` to user-facing copy
 * (docs/05-persistence.md § 9); `original` keeps the underlying cause.
 */
export class RepoError extends Error {
  readonly code: RepoErrorCode
  readonly original?: unknown

  constructor(code: RepoErrorCode, message?: string, original?: unknown) {
    super(message ?? `RepoError: ${code}`)
    this.name = 'RepoError'
    this.code = code
    this.original = original
  }
}
/** Discriminated error codes raised by the engine. */
export type EngineErrorCode = 'invalid_input' | 'timeout'

/**
 * Typed engine error. `message` is a plain, human-readable string — it never
 * carries stack-trace text; branch on `code` to handle the failure category.
 */
export class EngineError extends Error {
  readonly code: EngineErrorCode

  constructor(code: EngineErrorCode, message: string) {
    super(message)
    this.name = 'EngineError'
    this.code = code
  }
}
/** Returns a new UUID v4 string via the platform crypto API (no dependencies). */
export function newId(): string {
  return crypto.randomUUID()
}
/**
 * Deterministic FNV-1a 32-bit hash.
 *
 * Used to derive a default PRNG seed from `plan.meta.updatedAt`: identical
 * plans stay deterministic, while any edit that bumps `updatedAt` re-randomizes
 * the local search. Pure and dependency-free — never touches `Math.random`.
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Returns a mulberry32 PRNG seeded with `seed` (any 32-bit integer).
 * Outputs are floats in `[0, 1)`. Deterministic for a given seed.
 */
export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0
  return function mulberry32(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
import { describe, expect, it } from 'vitest'
import { simpleTwoTablesPlan } from './__fixtures__'
import { createMulberry32, detectConflicts, EngineError, generateSeating, scorePlan } from './index'

describe('engine public surface', () => {
  it('generates assignments and a consistent report end-to-end', () => {
    const plan = simpleTwoTablesPlan()
    const output = generateSeating(plan, { seed: 1 })
    expect(output.assignments).toHaveLength(12)
    expect(output.report.seatedGuests).toBe(12)
    expect(output.report.unseatedGuests).toBe(0)
    expect(output.report.durationMs).toBeGreaterThanOrEqual(0)

    const capacityByTable = new Map(plan.tables.map((t) => [t.id, t.capacity]))
    for (const a of output.assignments) {
      expect(a.seatIndex).toBeLessThan(capacityByTable.get(a.tableId) as number)
    }

    const refreshed = detectConflicts({ ...plan, assignments: output.assignments })
    expect({ ...refreshed, durationMs: 0 }).toEqual({ ...output.report, durationMs: 0 })
  })

  it('scorePlan returns a finite score for a generated run', () => {
    const plan = simpleTwoTablesPlan()
    const { assignments } = generateSeating(plan, { seed: 1 })
    const score = scorePlan(plan, assignments)
    expect(Number.isFinite(score)).toBe(true)
  })

  it('EngineError carries a code and a plain message', () => {
    const error = new EngineError('invalid_input', 'plan failed validation')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('EngineError')
    expect(error.code).toBe('invalid_input')
    expect(error.message).toBe('plan failed validation')
  })

  it('createMulberry32 is deterministic and bounded', () => {
    const a = createMulberry32(9)
    const b = createMulberry32(9)
    const seqA = [a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true)
  })
})
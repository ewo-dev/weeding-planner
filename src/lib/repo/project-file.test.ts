import { describe, expect, it } from 'vitest'
import { newId } from '@/lib/id'
import { CURRENT_VERSION } from '@/lib/schema/migrations'
import type { Plan } from '@/lib/schema/plan'
import { RepoError } from '@/lib/repo/errors'
import {
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_VERSION,
  parseProjectFileText,
  prepareImportedPlan,
  projectFileName,
  serializeProjectFile,
  stableStringify,
} from './project-file'

function validPlan(): Plan {
  const tableId = newId()
  const g1 = newId()
  const g2 = newId()
  const now = new Date().toISOString()
  return {
    meta: { id: newId(), name: 'Mariage Alice & Bob', createdAt: now, updatedAt: now, schemaVersion: 1 },
    tables: [{ id: tableId, name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }],
    guests: [
      { id: g1, name: 'Alice' },
      { id: g2, name: 'Bob' },
    ],
    constraints: [{ id: newId(), kind: 'must_together', a: g1, b: g2 }],
    assignments: [
      { guestId: g1, tableId, seatIndex: 0 },
      { guestId: g2, tableId, seatIndex: 1 },
    ],
  }
}

describe('project-file', () => {
  it('round-trips export then import to an identical plan', () => {
    const plan = validPlan()
    const text = serializeProjectFile(plan, '2026-09-21T10:42:11.000Z')

    const parsed = parseProjectFileText(text)
    expect(parsed.tables).toEqual(plan.tables)
    expect(parsed.guests).toEqual(plan.guests)
    // Constraint pairs are canonicalized at the persistence boundary
    // (D-009): (a, b) sorted lexicographically on export.
    const [constraint] = plan.constraints
    const expectedConstraints =
      constraint.a <= constraint.b
        ? plan.constraints
        : [{ ...constraint, a: constraint.b, b: constraint.a }]
    expect(parsed.constraints).toEqual(expectedConstraints)
    expect(parsed.assignments).toEqual(plan.assignments)
    expect(parsed.meta.schemaVersion).toBe(CURRENT_VERSION)
  })

  it('serializes deterministic JSON with sorted keys', () => {
    const plan = validPlan()
    const first = serializeProjectFile(plan, '2026-09-21T10:42:11.000Z')
    const second = serializeProjectFile(plan, '2026-09-21T10:42:11.000Z')
    expect(first).toBe(second)
    expect(first.endsWith('\n')).toBe(true)

    const parsed = JSON.parse(first) as Record<string, unknown>
    expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort())
    expect(parsed.format).toBe(PROJECT_FILE_FORMAT)
    expect(parsed.formatVersion).toBe(PROJECT_FILE_VERSION)
    expect(parsed.exportedAt).toBe('2026-09-21T10:42:11.000Z')
  })

  it('stableStringify sorts nested keys', () => {
    expect(stableStringify({ b: 1, a: { d: 4, c: 3 } })).toBe('{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "b": 1\n}\n')
  })

  it('canonicalizes constraint pairs on export', () => {
    const plan = validPlan()
    const [constraint] = plan.constraints
    const swapped: Plan = {
      ...plan,
      constraints: [{ ...constraint, a: constraint.b, b: constraint.a }],
    }
    const fromSwapped = parseProjectFileText(serializeProjectFile(swapped))
    const fromOrdered = parseProjectFileText(serializeProjectFile(plan))
    expect(fromSwapped.constraints).toEqual(fromOrdered.constraints)
  })

  it('rejects malformed JSON without throwing a raw SyntaxError', () => {
    try {
      parseProjectFileText('{broken')
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(RepoError)
      expect(err).toMatchObject({ code: 'corrupt' })
    }
  })

  it('rejects unknown formats', async () => {
    const text = JSON.stringify({
      format: 'something-else',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      plan: validPlan(),
    })
    await expect(
      (async () => parseProjectFileText(text))(),
    ).rejects.toMatchObject({ code: 'corrupt' })
  })

  it('rejects future format versions without data loss semantics', () => {
    const text = JSON.stringify({
      format: PROJECT_FILE_FORMAT,
      formatVersion: PROJECT_FILE_VERSION + 1,
      exportedAt: new Date().toISOString(),
      plan: validPlan(),
    })
    expect(() => parseProjectFileText(text)).toThrowError(RepoError)
    try {
      parseProjectFileText(text)
    } catch (err) {
      expect(err).toMatchObject({ code: 'corrupt' })
      expect(String((err as Error).message)).toMatch(/plus récente/)
    }
  })

  it('rejects future plan schema versions', () => {
    const plan = { ...validPlan(), meta: { ...validPlan().meta, schemaVersion: CURRENT_VERSION + 1 } }
    const text = JSON.stringify({
      format: PROJECT_FILE_FORMAT,
      formatVersion: PROJECT_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      plan,
    })
    expect(() => parseProjectFileText(text)).toThrowError(RepoError)
  })

  it('rejects plans that violate invariants', () => {
    const plan = validPlan()
    const bad = {
      format: PROJECT_FILE_FORMAT,
      formatVersion: PROJECT_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      plan: { ...plan, assignments: [{ guestId: newId(), tableId: newId(), seatIndex: 0 }] },
    }
    expect(() => parseProjectFileText(JSON.stringify(bad))).toThrowError(RepoError)
  })

  it('prepareImportedPlan assigns a fresh id and keeps the content', () => {
    const plan = validPlan()
    const imported = prepareImportedPlan(parseProjectFileText(serializeProjectFile(plan)))
    expect(imported.meta.id).not.toBe(plan.meta.id)
    expect(imported.tables).toEqual(plan.tables)
    expect(imported.guests).toEqual(plan.guests)
    expect(imported.assignments).toEqual(plan.assignments)
    expect(imported.meta.schemaVersion).toBe(CURRENT_VERSION)
  })

  it('derives safe filenames', () => {
    expect(projectFileName('Mariage Alice & Bob')).toBe('Mariage-Alice-Bob.json')
    expect(projectFileName('  ')).toBe('plan.json')
    expect(projectFileName('a/b\\c:d')).toBe('abcd.json')
  })
})

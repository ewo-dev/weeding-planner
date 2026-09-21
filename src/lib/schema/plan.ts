import { z } from 'zod'

// ---------- Meta ----------

export const PlanMetaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  createdAt: z.string().datetime(), // ISO-8601
  updatedAt: z.string().datetime(), // ISO-8601
  schemaVersion: z.number().int(),
})

// ---------- Tables ----------

export const TableShapeSchema = z.enum(['round', 'rectangle'])

export const TablePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const TableSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  shape: TableShapeSchema,
  capacity: z.number().int().min(1).max(20),
  position: TablePositionSchema,
})

// ---------- Guests ----------

export const GuestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  group: z.string().optional(),
  notes: z.string().optional(),
})

// ---------- Constraints ----------

export const ConstraintKindSchema = z.enum([
  'must_together', // mandatory: A and B at the same table
  'prefer_together', // soft preference
  'must_not_together', // mandatory separation
])

export const ConstraintSchema = z
  .object({
    id: z.string().uuid(),
    kind: ConstraintKindSchema,
    a: z.string().uuid(),
    b: z.string().uuid(),
  })
  .refine((c) => c.a !== c.b, {
    message: 'a and b must be different guests',
    path: ['b'],
  })

// ---------- Assignments ----------

export const AssignmentSchema = z.object({
  guestId: z.string().uuid(),
  tableId: z.string().uuid(),
  seatIndex: z.number().int().min(0),
})

// ---------- Plan ----------

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

export const PlanSchema = z
  .object({
    meta: PlanMetaSchema,
    tables: z.array(TableSchema),
    guests: z.array(GuestSchema),
    constraints: z.array(ConstraintSchema),
    assignments: z.array(AssignmentSchema),
  })
  .superRefine((plan, ctx) => {
    const tableIds = new Set<string>()
    const guestIds = new Set<string>()
    const constraintIds = new Set<string>()

    for (const table of plan.tables) {
      if (tableIds.has(table.id)) {
        ctx.addIssue({ code: 'custom', path: ['tables'], message: `duplicate table id: ${table.id}` })
      }
      tableIds.add(table.id)
    }

    for (const guest of plan.guests) {
      if (guestIds.has(guest.id)) {
        ctx.addIssue({ code: 'custom', path: ['guests'], message: `duplicate guest id: ${guest.id}` })
      }
      guestIds.add(guest.id)
    }

    for (const constraint of plan.constraints) {
      if (constraintIds.has(constraint.id)) {
        ctx.addIssue({ code: 'custom', path: ['constraints'], message: `duplicate constraint id: ${constraint.id}` })
      }
      constraintIds.add(constraint.id)
    }

    // Table names must be unique within the plan.
    const tableNames = new Set<string>()
    for (const table of plan.tables) {
      if (tableNames.has(table.name)) {
        ctx.addIssue({ code: 'custom', path: ['tables'], message: `duplicate table name: ${table.name}` })
      }
      tableNames.add(table.name)
    }

    // A pair of guests cannot carry both must_together and must_not_together.
    const pairConstraintKinds = new Map<string, ConstraintKind>()
    for (const constraint of plan.constraints) {
      const key = pairKey(constraint.a, constraint.b)
      const existing = pairConstraintKinds.get(key)
      if (
        existing &&
        ((existing === 'must_together' && constraint.kind === 'must_not_together') ||
          (existing === 'must_not_together' && constraint.kind === 'must_together'))
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['constraints'],
          message: `pair (${constraint.a}, ${constraint.b}) has both must_together and must_not_together`,
        })
      }
      if (!existing) {
        pairConstraintKinds.set(key, constraint.kind)
      }
    }

    // Assignments must reference existing entities and fit inside seat capacity.
    const capacityByTable = new Map(plan.tables.map((t) => [t.id, t.capacity] as const))
    const occupiedSeats = new Set<string>()
    const assignedGuests = new Set<string>()

    plan.assignments.forEach((assignment, index) => {
      const path = ['assignments', index]
      if (!guestIds.has(assignment.guestId)) {
        ctx.addIssue({ code: 'custom', path, message: `references unknown guest: ${assignment.guestId}` })
      }
      const capacity = capacityByTable.get(assignment.tableId)
      if (capacity === undefined) {
        ctx.addIssue({ code: 'custom', path, message: `references unknown table: ${assignment.tableId}` })
      } else if (assignment.seatIndex >= capacity) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `seatIndex ${assignment.seatIndex} out of range for capacity ${capacity}`,
        })
      }
      const seatKey = `${assignment.tableId}:${assignment.seatIndex}`
      if (occupiedSeats.has(seatKey)) {
        ctx.addIssue({ code: 'custom', path, message: `seat already occupied: ${seatKey}` })
      }
      occupiedSeats.add(seatKey)
      if (assignedGuests.has(assignment.guestId)) {
        ctx.addIssue({ code: 'custom', path, message: `guest assigned more than once: ${assignment.guestId}` })
      }
      assignedGuests.add(assignment.guestId)
    })
  })

// ---------- Inferred types ----------

export type PlanMeta = z.infer<typeof PlanMetaSchema>
export type TableShape = z.infer<typeof TableShapeSchema>
export type TablePosition = z.infer<typeof TablePositionSchema>
export type Table = z.infer<typeof TableSchema>
export type Guest = z.infer<typeof GuestSchema>
export type ConstraintKind = z.infer<typeof ConstraintKindSchema>
export type Constraint = z.infer<typeof ConstraintSchema>
export type Assignment = z.infer<typeof AssignmentSchema>
export type Plan = z.infer<typeof PlanSchema>
import type { Table, TableShape } from '@/types/plan'
import { fr, format, type Messages } from '@/lib/i18n'

// Bounds mirror TableSchema (src/lib/schema/plan.ts).
export const TABLE_MIN_CAPACITY = 1
export const TABLE_MAX_CAPACITY = 20
export const TABLE_MAX_NAME = 40

/** Defaults for newly added tables (docs/01-product.md § 4 shows 8 seats). */
export const DEFAULT_TABLE_CAPACITY = 8
export const DEFAULT_TABLE_SHAPE: TableShape = 'round'

export function shapeLabel(shape: TableShape, messages: Messages = fr): string {
  return shape === 'round' ? messages.tables.shapeRound : messages.tables.shapeRectangle
}

/** First free "Table N" name (names must be unique — docs/03-data-model.md § 4.2). */
export function nextTableName(tables: Table[], messages: Messages = fr): string {
  const taken = new Set(tables.map((t) => t.name))
  let n = tables.length + 1
  while (taken.has(format(messages.tables.defaultName, { n }))) n += 1
  return format(messages.tables.defaultName, { n })
}

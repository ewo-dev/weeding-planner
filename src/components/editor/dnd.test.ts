import { describe, expect, it } from 'vitest'
import {
  UNSEAT_DROP_ID,
  WORKSPACE_DROP_ID,
  arrowKeyboardCoordinates,
  guestDragId,
  parseDndId,
  seatDropId,
  tableDragId,
} from './dnd'

describe('dnd ids', () => {
  it('round-trips guest, seat and table ids', () => {
    const guestId = '00000000-0000-4000-8000-000000000001'
    const tableId = '10000000-0000-4000-8000-000000000001'

    expect(parseDndId(guestDragId(guestId))).toEqual({ kind: 'guest', guestId })
    expect(parseDndId(seatDropId(tableId, 3))).toEqual({ kind: 'seat', tableId, seatIndex: 3 })
    expect(parseDndId(tableDragId(tableId))).toEqual({ kind: 'table', tableId })
    expect(parseDndId(UNSEAT_DROP_ID)).toEqual({ kind: 'unseat' })
    expect(parseDndId(WORKSPACE_DROP_ID)).toEqual({ kind: 'workspace' })
  })

  it('rejects malformed ids', () => {
    expect(parseDndId('')).toEqual({ kind: 'unknown' })
    expect(parseDndId('seat:only-one-part')).toEqual({ kind: 'unknown' })
    expect(parseDndId('seat:t1:not-a-number')).toEqual({ kind: 'unknown' })
    expect(parseDndId('seat:t1:1:extra')).toEqual({ kind: 'unknown' })
    expect(parseDndId('guest:')).toEqual({ kind: 'unknown' })
    expect(parseDndId('table:')).toEqual({ kind: 'unknown' })
    expect(parseDndId('random-string')).toEqual({ kind: 'unknown' })
  })
})

describe('arrowKeyboardCoordinates', () => {
  it('moves 25 px per arrow key and ignores other keys', () => {
    const at = { x: 100, y: 100 }
    const key = (code: string) => new KeyboardEvent('keydown', { code })

    expect(arrowKeyboardCoordinates(key('ArrowRight'), { currentCoordinates: at })).toEqual({ x: 125, y: 100 })
    expect(arrowKeyboardCoordinates(key('ArrowLeft'), { currentCoordinates: at })).toEqual({ x: 75, y: 100 })
    expect(arrowKeyboardCoordinates(key('ArrowDown'), { currentCoordinates: at })).toEqual({ x: 100, y: 125 })
    expect(arrowKeyboardCoordinates(key('ArrowUp'), { currentCoordinates: at })).toEqual({ x: 100, y: 75 })
    expect(arrowKeyboardCoordinates(key('Enter'), { currentCoordinates: at })).toBeUndefined()
  })
})

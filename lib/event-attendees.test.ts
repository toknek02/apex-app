import { describe, it, expect } from 'vitest'
import { formatAttendees } from '@/lib/event-attendees'

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)

describe('formatAttendees', () => {
  it('lists everyone when at or under the cap', () => {
    expect(formatAttendees(names(1))).toBe('P1')
    expect(formatAttendees(names(5))).toBe('P1, P2, P3, P4, P5')
  })

  it('caps at 5 and counts the rest', () => {
    expect(formatAttendees(names(9))).toBe('P1, P2, P3, P4, P5 and 4 others')
  })

  it('uses the singular for exactly one hidden name', () => {
    expect(formatAttendees(names(6))).toBe('P1, P2, P3, P4, P5 and 1 other')
  })

  it('returns an empty string for no attendees', () => {
    expect(formatAttendees([])).toBe('')
  })
})

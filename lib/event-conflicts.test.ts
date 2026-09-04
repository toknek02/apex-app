import { describe, it, expect } from 'vitest'
import { overlaps } from '@/lib/event-conflicts'

const at = (time: string) => new Date(`2026-09-03T${time}:00`)

describe('overlaps', () => {
  it('catches an exact same-start clash', () => {
    expect(overlaps(at('09:00'), 60, at('09:00'), 60)).toBe(true)
  })

  it('catches a partial overlap from either side', () => {
    expect(overlaps(at('09:00'), 60, at('09:30'), 60)).toBe(true)
    expect(overlaps(at('09:30'), 60, at('09:00'), 60)).toBe(true)
  })

  it('catches a short meeting sitting inside a long one', () => {
    expect(overlaps(at('09:00'), 480, at('14:00'), 30)).toBe(true)
  })

  it('allows back-to-back meetings (one ends exactly as the next starts)', () => {
    expect(overlaps(at('09:00'), 60, at('10:00'), 60)).toBe(false)
    expect(overlaps(at('10:00'), 60, at('09:00'), 60)).toBe(false)
  })

  it('allows meetings that do not touch', () => {
    expect(overlaps(at('09:00'), 30, at('11:00'), 30)).toBe(false)
  })

  it('spans across days for long durations', () => {
    expect(overlaps(new Date('2026-09-03T23:00:00'), 120, new Date('2026-09-04T00:30:00'), 30)).toBe(true)
  })
})

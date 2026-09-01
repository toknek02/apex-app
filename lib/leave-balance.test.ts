import { describe, it, expect } from 'vitest'
import { computeBalance, daysForApplication } from '@/lib/leave-balance'

const day = (s: string) => new Date(s + 'T00:00:00')
const range = (start: string, end: string, dayPortion = 'FULL') => ({
  startDate: day(start),
  endDate: day(end),
  dayPortion,
})

describe('daysForApplication', () => {
  it('counts an inclusive single day as 1', () => {
    expect(daysForApplication(range('2026-03-02', '2026-03-02'))).toBe(1)
  })

  it('counts an inclusive multi-day range', () => {
    expect(daysForApplication(range('2026-03-02', '2026-03-06'))).toBe(5)
  })

  it('treats an AM/PM half-day as 0.5 regardless of dates', () => {
    expect(daysForApplication(range('2026-03-02', '2026-03-02', 'AM'))).toBe(0.5)
    expect(daysForApplication(range('2026-03-02', '2026-03-02', 'PM'))).toBe(0.5)
  })
})

describe('computeBalance', () => {
  it('is unrestricted when nothing is configured (entitlement null, brought-forward 0)', () => {
    const b = computeBalance(2026, null, 0, [range('2026-01-05', '2026-01-06')])
    expect(b.totalAvailable).toBeNull()
    expect(b.remaining).toBeNull()
    expect(b.usedDays).toBe(2)
  })

  it('stays restricted when only brought-forward is set (entitlement left blank)', () => {
    const b = computeBalance(2026, null, 3, [])
    expect(b.totalAvailable).toBe(3)
    expect(b.remaining).toBe(3)
  })

  it('adds entitlement and brought-forward, then subtracts used days', () => {
    const b = computeBalance(2026, 14, 2, [
      range('2026-02-02', '2026-02-04'), // 3
      range('2026-05-01', '2026-05-01', 'AM'), // 0.5
    ])
    expect(b.totalAvailable).toBe(16)
    expect(b.usedDays).toBe(3.5)
    expect(b.remaining).toBe(12.5)
  })

  it('allows remaining to go negative when over the entitlement', () => {
    const b = computeBalance(2026, 1, 0, [range('2026-06-01', '2026-06-05')])
    expect(b.remaining).toBe(-4)
  })

  it('treats a zero entitlement as configured (not unrestricted)', () => {
    const b = computeBalance(2026, 0, 0, [range('2026-06-01', '2026-06-01')])
    expect(b.totalAvailable).toBe(0)
    expect(b.remaining).toBe(-1)
  })
})

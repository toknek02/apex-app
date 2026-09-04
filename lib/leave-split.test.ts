import { describe, it, expect } from 'vitest'
import { planLeaveSplit, buildSplitSegments, UNPAID_ANNUAL_LEAVE } from '@/lib/leave-split'
import { enumerateDaysInclusive } from '@/lib/date-utils'

const d = (s: string) => new Date(`${s}T00:00:00`)
const plan = (start: string, end: string, remaining: number | null, dayPortion = 'FULL') =>
  planLeaveSplit({ startDate: d(start), endDate: d(end), dayPortion, remaining })

describe('planLeaveSplit', () => {
  it('is a single application when it fits the balance', () => {
    expect(plan('2026-03-02', '2026-03-06', 10).kind).toBe('single')
  })

  it('is a single application when no entitlement is configured', () => {
    expect(plan('2026-03-02', '2026-03-06', null).kind).toBe('single')
  })

  it('splits a request that runs past the balance', () => {
    expect(plan('2026-03-02', '2026-03-06', 2)).toEqual({ kind: 'splittable', requestedDays: 5, paidDays: 2, unpaidDays: 3 })
  })

  it('leaves a spare half-day of balance unused rather than splitting mid-day', () => {
    expect(plan('2026-03-02', '2026-03-06', 2.5)).toEqual({ kind: 'splittable', requestedDays: 5, paidDays: 2, unpaidDays: 3 })
  })

  it('cannot split when nothing is left — the whole request must be unpaid', () => {
    expect(plan('2026-03-02', '2026-03-06', 0).kind).toBe('over')
  })

  it('cannot split a half-day request', () => {
    expect(plan('2026-03-02', '2026-03-02', 0, 'AM').kind).toBe('over')
  })

  it('splits down to the smallest case, 1 paid + 1 unpaid', () => {
    expect(plan('2026-03-02', '2026-03-03', 1)).toMatchObject({ kind: 'splittable', paidDays: 1, unpaidDays: 1 })
  })
})

describe('buildSplitSegments', () => {
  it('produces adjacent segments that conserve every requested day', () => {
    const [paid, unpaid] = buildSplitSegments(d('2026-03-02'), d('2026-03-06'), 2, 'Annual Leave')
    expect(paid.leaveType).toBe('Annual Leave')
    expect(unpaid.leaveType).toBe(UNPAID_ANNUAL_LEAVE)

    const count = (a: { startDate: Date; endDate: Date }) => enumerateDaysInclusive(a.startDate, a.endDate).length
    expect(count(paid) + count(unpaid)).toBe(5) // no day lost or duplicated
    // Adjacent, not overlapping — or the API's own overlap guard would reject
    // the second application.
    expect(paid.endDate.getTime()).toBeLessThan(unpaid.startDate.getTime())
  })
})

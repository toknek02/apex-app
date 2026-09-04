import { enumerateDaysInclusive, daysForApplication } from '@/lib/date-utils'

export const UNPAID_ANNUAL_LEAVE = 'Unpaid Annual Leave'

export type LeaveSegment = { leaveType: string; startDate: Date; endDate: Date; dayPortion: string }

export type LeaveSplit =
  /** Fits the balance (or none is configured) — submit as one application. */
  | { kind: 'single'; requestedDays: number }
  /** Over balance, and splitting is possible if the applicant opts in. */
  | { kind: 'splittable'; requestedDays: number; paidDays: number; unpaidDays: number }
  /** Over balance and can't be split — the whole thing must be Unpaid. */
  | { kind: 'over'; requestedDays: number }

/**
 * Works out whether a request fits the Annual Leave balance, and if not,
 * whether it can be split into paid days followed by unpaid ones.
 *
 * Shared by the application form and POST /api/leave-applications so the
 * preview shown to the applicant is exactly what the server will do — the two
 * previously computed this separately and could disagree.
 *
 * Only whole days split: a half-day request is a single day and can't be
 * divided, and a multi-day range can't end mid-afternoon, so any leftover half
 * day of balance goes unused.
 */
export function planLeaveSplit(opts: {
  startDate: Date
  endDate: Date
  dayPortion: string
  remaining: number | null
}): LeaveSplit {
  const { startDate, endDate, dayPortion, remaining } = opts
  const requestedDays = daysForApplication({ startDate, endDate, dayPortion })
  if (remaining === null || requestedDays <= remaining) return { kind: 'single', requestedDays }

  const paidDays = Math.floor(Math.max(remaining, 0))
  if (dayPortion !== 'FULL' || paidDays <= 0 || paidDays >= requestedDays) return { kind: 'over', requestedDays }
  return { kind: 'splittable', requestedDays, paidDays, unpaidDays: requestedDays - paidDays }
}

/** The two adjacent applications a splittable request becomes. */
export function buildSplitSegments(startDate: Date, endDate: Date, paidDays: number, paidLeaveType: string): LeaveSegment[] {
  const days = enumerateDaysInclusive(startDate, endDate)
  return [
    { leaveType: paidLeaveType, startDate: days[0], endDate: days[paidDays - 1], dayPortion: 'FULL' },
    { leaveType: UNPAID_ANNUAL_LEAVE, startDate: days[paidDays], endDate: days[days.length - 1], dayPortion: 'FULL' },
  ]
}

import { prisma } from '@/lib/prisma'
import { enumerateDaysInclusive } from '@/lib/date-utils'

const ANNUAL_LEAVE_TYPE = 'Annual Leave'
// Both stages of pending review reserve balance immediately on submission,
// not just APPROVED — otherwise two overlapping applications could each be
// approved even though together they exceed the entitlement, since neither
// one "used" any balance until the director signed off.
const BALANCE_HOLDING_STATUSES = ['PENDING_ARCHITECT', 'PENDING_DIRECTOR', 'APPROVED']

export function daysForApplication(a: { startDate: Date; endDate: Date; dayPortion: string }): number {
  if (a.dayPortion === 'AM' || a.dayPortion === 'PM') return 0.5
  return enumerateDaysInclusive(a.startDate, a.endDate).length
}

export type AnnualLeaveBalance = {
  year: number
  entitlement: number | null
  broughtForward: number
  totalAvailable: number | null
  usedDays: number
  remaining: number | null
}

// Balance is scoped to a single calendar year — HR re-enters entitlement and
// brought-forward at the start of each year (see prisma/schema.prisma), so
// this only ever reflects "this year's" numbers, not a multi-year ledger.
export async function getAnnualLeaveBalance(userId: string, year: number = new Date().getFullYear()): Promise<AnnualLeaveBalance> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const [user, applications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { annualLeaveEntitlement: true, annualLeaveBroughtForward: true } }),
    prisma.leaveApplication.findMany({
      where: {
        userId,
        leaveType: ANNUAL_LEAVE_TYPE,
        status: { in: BALANCE_HOLDING_STATUSES },
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: { startDate: true, endDate: true, dayPortion: true },
    }),
  ])

  const usedDays = applications.reduce((sum, a) => sum + daysForApplication(a), 0)
  const entitlement = user?.annualLeaveEntitlement ?? null
  const broughtForward = user?.annualLeaveBroughtForward ?? 0
  const totalAvailable = entitlement === null ? null : entitlement + broughtForward
  const remaining = totalAvailable === null ? null : totalAvailable - usedDays

  return { year, entitlement, broughtForward, totalAvailable, usedDays, remaining }
}

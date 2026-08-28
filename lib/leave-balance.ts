import { prisma } from '@/lib/prisma'
import { enumerateDaysInclusive } from '@/lib/date-utils'

const ANNUAL_LEAVE_TYPE = 'Annual Leave'
const MEDICAL_LEAVE_TYPE = 'Medical Leave (MC)'
// Both stages of pending review reserve balance immediately on submission,
// not just APPROVED — otherwise two overlapping applications could each be
// approved even though together they exceed the entitlement, since neither
// one "used" any balance until the director signed off.
const BALANCE_HOLDING_STATUSES = ['PENDING_ARCHITECT', 'PENDING_DIRECTOR', 'APPROVED']

export function daysForApplication(a: { startDate: Date; endDate: Date; dayPortion: string }): number {
  if (a.dayPortion === 'AM' || a.dayPortion === 'PM') return 0.5
  return enumerateDaysInclusive(a.startDate, a.endDate).length
}

export type LeaveBalance = {
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
// Shared by both Annual Leave and Medical Leave, which track balance the
// same way against their own pair of entitlement/brought-forward columns.
async function getLeaveBalance(
  userId: string,
  leaveType: string,
  entitlementField: 'annualLeaveEntitlement' | 'medicalLeaveEntitlement',
  broughtForwardField: 'annualLeaveBroughtForward' | 'medicalLeaveBroughtForward',
  year: number
): Promise<LeaveBalance> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const [user, applications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { [entitlementField]: true, [broughtForwardField]: true } }),
    prisma.leaveApplication.findMany({
      where: {
        userId,
        leaveType,
        status: { in: BALANCE_HOLDING_STATUSES },
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: { startDate: true, endDate: true, dayPortion: true },
    }),
  ])

  const usedDays = applications.reduce((sum, a) => sum + daysForApplication(a), 0)
  const entitlement = (user?.[entitlementField] as number | null | undefined) ?? null
  const broughtForward = (user?.[broughtForwardField] as number | undefined) ?? 0
  // Unrestricted only when NOTHING has been configured — a Brought Forward
  // value entered without an Entitlement still means HR set something, and
  // it shouldn't silently vanish just because Entitlement was left blank.
  const isConfigured = entitlement !== null || broughtForward !== 0
  const totalAvailable = isConfigured ? (entitlement ?? 0) + broughtForward : null
  const remaining = totalAvailable === null ? null : totalAvailable - usedDays

  return { year, entitlement, broughtForward, totalAvailable, usedDays, remaining }
}

export type AnnualLeaveBalance = LeaveBalance

export async function getAnnualLeaveBalance(userId: string, year: number = new Date().getFullYear()): Promise<AnnualLeaveBalance> {
  return getLeaveBalance(userId, ANNUAL_LEAVE_TYPE, 'annualLeaveEntitlement', 'annualLeaveBroughtForward', year)
}

export async function getMedicalLeaveBalance(userId: string, year: number = new Date().getFullYear()): Promise<LeaveBalance> {
  return getLeaveBalance(userId, MEDICAL_LEAVE_TYPE, 'medicalLeaveEntitlement', 'medicalLeaveBroughtForward', year)
}

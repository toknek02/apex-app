import { prisma } from '@/lib/prisma'
import { daysForApplication } from '@/lib/date-utils'

// Re-exported so existing callers (and the balance tests) keep importing it
// from here, while the client-side form can reach it without pulling in Prisma.
export { daysForApplication }

const ANNUAL_LEAVE_TYPE = 'Annual Leave'
const MEDICAL_LEAVE_TYPE = 'Medical Leave (MC)'
// Both stages of pending review reserve balance immediately on submission,
// not just APPROVED — otherwise two overlapping applications could each be
// approved even though together they exceed the entitlement, since neither
// one "used" any balance until the director signed off.
const BALANCE_HOLDING_STATUSES = ['PENDING_ARCHITECT', 'PENDING_DIRECTOR', 'APPROVED']


export type LeaveBalance = {
  year: number
  entitlement: number | null
  broughtForward: number
  totalAvailable: number | null
  usedDays: number
  remaining: number | null
}
export type AnnualLeaveBalance = LeaveBalance

type BalanceApp = { startDate: Date; endDate: Date; dayPortion: string }

export function computeBalance(year: number, entitlement: number | null, broughtForward: number, applications: BalanceApp[]): LeaveBalance {
  const usedDays = applications.reduce((sum, a) => sum + daysForApplication(a), 0)
  // Unrestricted only when NOTHING has been configured — a Brought Forward
  // value entered without an Entitlement still means HR set something, and
  // it shouldn't silently vanish just because Entitlement was left blank.
  const isConfigured = entitlement !== null || broughtForward !== 0
  const totalAvailable = isConfigured ? (entitlement ?? 0) + broughtForward : null
  const remaining = totalAvailable === null ? null : totalAvailable - usedDays
  return { year, entitlement, broughtForward, totalAvailable, usedDays, remaining }
}

// Balance is scoped to a single calendar year — HR re-enters entitlement and
// brought-forward at the start of each year (see prisma/schema.prisma), so
// this only ever reflects "this year's" numbers, not a multi-year ledger.
function heldApplications(userId: string, leaveTypes: string[], year: number) {
  return prisma.leaveApplication.findMany({
    where: {
      userId,
      leaveType: { in: leaveTypes },
      status: { in: BALANCE_HOLDING_STATUSES },
      startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) },
    },
    select: { startDate: true, endDate: true, dayPortion: true, leaveType: true },
  })
}

export async function getAnnualLeaveBalance(userId: string, year: number = new Date().getFullYear()): Promise<AnnualLeaveBalance> {
  const [user, applications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { annualLeaveEntitlement: true, annualLeaveBroughtForward: true } }),
    heldApplications(userId, [ANNUAL_LEAVE_TYPE], year),
  ])
  return computeBalance(year, user?.annualLeaveEntitlement ?? null, user?.annualLeaveBroughtForward ?? 0, applications)
}

// Both balances from one user row + one applications query, for pages (e.g. the
// profile) that show Annual and Medical side by side.
export async function getBothLeaveBalances(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<{ annual: LeaveBalance; medical: LeaveBalance }> {
  const [user, applications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        annualLeaveEntitlement: true,
        annualLeaveBroughtForward: true,
        medicalLeaveEntitlement: true,
        medicalLeaveBroughtForward: true,
      },
    }),
    heldApplications(userId, [ANNUAL_LEAVE_TYPE, MEDICAL_LEAVE_TYPE], year),
  ])
  return {
    annual: computeBalance(
      year,
      user?.annualLeaveEntitlement ?? null,
      user?.annualLeaveBroughtForward ?? 0,
      applications.filter((a) => a.leaveType === ANNUAL_LEAVE_TYPE)
    ),
    medical: computeBalance(
      year,
      user?.medicalLeaveEntitlement ?? null,
      user?.medicalLeaveBroughtForward ?? 0,
      applications.filter((a) => a.leaveType === MEDICAL_LEAVE_TYPE)
    ),
  }
}
